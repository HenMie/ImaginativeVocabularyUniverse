import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { LevelFile } from '../types/levels'
import type { TranslationMap } from '../types/language'
import { getHintCostForUsage } from '../constants/economy'
import { getGroupColorByIndex } from '../constants/groupColors'
import { useProgressStore } from './progressStore'
import { SESSION_STORAGE_KEY } from '../constants/storage'
import {
  buildCompletedGroup,
  createSmartInitialTiles,
  findMatches,
  groupLookup,
  swapTiles,
  type CompletedGroup,
  type MatchResult,
  type TileInstance,
} from '../utils/board'
import { pickTranslation } from '../utils/translation'

export type HintType = 'group' | 'theme' | 'autoComplete' | 'verify'

interface HintState {
  highlightedGroupId?: string
  highlightedTileIds: string[]
  highlightContext?:
    | 'hint'
    | 'assemble'
    | 'verify-reveal-success'
    | 'verify-reveal-fail'
    | 'complete'
    | 'result'
  pendingRowInspection: boolean
  tileHighlightPresets: Record<string, string>
  lastVerification?: {
    rowIndex: number
    success: boolean
    groupId?: string
  }
}

interface LevelSessionState {
  status: 'idle' | 'ready' | 'completed'
  level?: LevelFile
  currentLevelId?: string
  columns: number
  tiles: TileInstance[]
  reserveTiles: TileInstance[]
  completedGroups: CompletedGroup[]
  hints: Record<HintType, number>
  hintState: HintState
  groupColors: Record<string, string>
  activeTile?: TileInstance
  revealedCategories: string[]
  tileColorOverrides: Record<string, string>
  freeHints: boolean
  initialize: (
    level: LevelFile,
    levelId: string,
    options?: { forceRestart?: boolean; freeHints?: boolean },
  ) => void
  reorder: (from: number, to: number) => void
  selectTile: (tileId?: string) => void
  useGroupHint: () =>
    | {
        success: true
        groupId: string
        tileIds: string[]
        category: TranslationMap
        sample: { text: TranslationMap; translation: string }
      }
    | { success: false; reason: 'insufficient-coins' | 'no-groups' }
  useAutoComplete: () =>
    | {
        success: true
        groupId: string
        category: TranslationMap
        tileIds: string[]
      }
    | { success: false; reason: 'insufficient-coins' | 'no-groups' }
  revealTheme: () =>
    | { success: true; topics: TranslationMap[] }
    | { success: false; reason: 'insufficient-coins' | 'no-groups' }
  beginRowVerification: () =>
    | { success: true }
    | { success: false; reason: 'pending' | 'insufficient-coins' }
  verifyRow: (
    rowIndex: number,
  ) => { success: boolean; tileIds: string[]; groupId?: string; reason?: 'not-ready' | 'invalid-row' }
  clearHighlights: () => void
  reset: () => void
  clearSession: (levelId?: string) => void
}

const createInitialHintState = (): HintState => ({
  highlightedGroupId: undefined,
  highlightedTileIds: [],
  highlightContext: undefined,
  pendingRowInspection: false,
  tileHighlightPresets: {},
  lastVerification: undefined,
})

const createInitialHints = (): Record<HintType, number> => ({
  group: 0,
  theme: 0,
  autoComplete: 0,
  verify: 0,
})

type SessionPersistedState = Pick<
  LevelSessionState,
  | 'status'
  | 'level'
  | 'currentLevelId'
  | 'columns'
  | 'tiles'
  | 'reserveTiles'
  | 'completedGroups'
  | 'hints'
  | 'hintState'
  | 'groupColors'
  | 'revealedCategories'
  | 'tileColorOverrides'
  | 'freeHints'
>

const MAX_VISIBLE_ROWS = 6

const sessionStorage = createJSONStorage<SessionPersistedState>(() => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      key: () => null,
      length: 0,
      clear: () => {},
    } as unknown as Storage
  }
  return window.localStorage
})

const hashGroupIdToIndex = (groupId: string): number => {
  let hash = 0
  for (let i = 0; i < groupId.length; i += 1) {
    hash = (hash * 31 + groupId.charCodeAt(i)) >>> 0
  }
  return hash
}

const resolvePresetId = (groupId: string, fallbackIndex = 0): string => {
  if (!groupId) {
    return getGroupColorByIndex(fallbackIndex).id
  }
  const index = hashGroupIdToIndex(groupId)
  return getGroupColorByIndex(index).id
}

const getDefinedPresetId = (level: LevelFile | undefined, groupId: string): string | undefined => {
  if (!level || !groupId) return undefined
  return level.groups.find((group) => group.id === groupId)?.colorPreset
}

const harmonizeGroupColors = (
  level: LevelFile | undefined,
  existing: Record<string, string>,
): Record<string, string> => {
  if (!level) return existing
  const next: Record<string, string> = {}
  Object.entries(existing).forEach(([groupId, presetId]) => {
    const defined = getDefinedPresetId(level, groupId)
    next[groupId] = defined ?? presetId
  })
  return next
}

const harmonizeTileOverrides = (
  level: LevelFile | undefined,
  tiles: TileInstance[],
  overrides: Record<string, string>,
): Record<string, string> => {
  if (!level || Object.keys(overrides).length === 0) return overrides
  const tileLookup = new Map(tiles.map((tile) => [tile.instanceId, tile]))
  const next: Record<string, string> = {}
  Object.entries(overrides).forEach(([tileId, presetId]) => {
    const tile = tileLookup.get(tileId)
    if (!tile?.groupId) {
      next[tileId] = presetId
      return
    }
    const defined = getDefinedPresetId(level, tile.groupId)
    next[tileId] = defined ?? presetId ?? resolvePresetId(tile.groupId)
  })
  return next
}

const fillVisibleTiles = (
  tiles: TileInstance[],
  reserveTiles: TileInstance[],
  columns: number,
) => {
  const maxVisible = columns * MAX_VISIBLE_ROWS
  const nextTiles = [...tiles]
  const nextReserve = [...reserveTiles]
  while (nextTiles.length > maxVisible) {
    const overflow = nextTiles.pop()
    if (!overflow) break
    nextReserve.unshift(overflow)
  }
  while (nextTiles.length < maxVisible && nextReserve.length > 0) {
    const [tile] = nextReserve.splice(0, 1)
    if (!tile) break
    nextTiles.push(tile)
  }
  return { tiles: nextTiles, reserveTiles: nextReserve }
}

export const useSessionStore = create<LevelSessionState>()(
  persist(
    (set, get) => {
      const resetState = () => {
        set({
          status: 'idle',
          level: undefined,
          currentLevelId: undefined,
          columns: 4,
          tiles: [],
          reserveTiles: [],
          completedGroups: [],
          hints: createInitialHints(),
          hintState: createInitialHintState(),
          groupColors: {},
          activeTile: undefined,
          revealedCategories: [],
          tileColorOverrides: {},
          freeHints: false,
        })
      }

      const shuffle = <T,>(input: T[]): T[] => {
        const arr = [...input]
        for (let i = arr.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr
      }

      const assignGroupColor = (groupId: string) => {
        if (!groupId) {
          return resolvePresetId(groupId)
        }
        let assigned = resolvePresetId(groupId)
        set((state) => {
          const defined = getDefinedPresetId(state.level, groupId)
          const current = state.groupColors[groupId]
          const target = defined ?? current ?? resolvePresetId(groupId)
          assigned = target
          if (current === target) {
            return {}
          }
          return {
            groupColors: {
              ...state.groupColors,
              [groupId]: target,
            },
          }
        })
        return assigned
      }

      const resetHighlightsState = () => {
        set((state) => ({
          hintState: {
            ...state.hintState,
            highlightedGroupId: undefined,
            highlightedTileIds: [],
            highlightContext: undefined,
        tileHighlightPresets: {},
          },
        }))
      }

      const applyMatches = (matches: MatchResult[]) => {
        const state = get()
        if (!state.level || matches.length === 0) return

        const grouped = groupLookup(state.level.groups)
        const matchedIds = new Set(matches.flatMap((match) => match.tileIds))
        const newlyCompleted = matches
          .map((match) => {
            const group = grouped[match.groupId]
            if (!group) return undefined
            return buildCompletedGroup(group, state.tiles, match)
          })
          .filter((item): item is CompletedGroup => Boolean(item))

        const completedGroups = [...state.completedGroups, ...newlyCompleted]
        const nextStatus =
          completedGroups.length === state.level.groups.length ? 'completed' : state.status

        const revealedSet = new Set(state.revealedCategories)
        matches.forEach((match) => {
          // 使用group ID作为已揭示类别的标识，因为category现在是TranslationMap
          if (match.groupId) {
            revealedSet.add(match.groupId)
          }
          assignGroupColor(match.groupId)
        })

        // 原地标记完成的词块，不移动位置
        const updatedTiles = state.tiles.map((tile) => {
          if (matchedIds.has(tile.instanceId)) {
            return { ...tile, status: 'completed' as const }
          }
          return tile
        })

        // 清除已完成词块的颜色覆盖
        const overrides = { ...state.tileColorOverrides }
        matchedIds.forEach((id) => {
          delete overrides[id]
        })

        const activeRemoved =
          state.activeTile && matchedIds.has(state.activeTile.instanceId)
        const highlightIds: string[] = []
        const highlightGroupId = undefined
        const highlightContext: HintState['highlightContext'] | undefined = undefined

        set({
          tiles: updatedTiles,
          completedGroups,
          status: nextStatus,
          activeTile: activeRemoved ? undefined : state.activeTile,
          tileColorOverrides: overrides,
          hintState: {
            ...state.hintState,
            highlightedGroupId: highlightGroupId,
            highlightedTileIds: highlightIds,
            highlightContext,
            pendingRowInspection: false,
          tileHighlightPresets: {},
          },
          revealedCategories: Array.from(revealedSet),
        })
      }

      type ChargeHintResult =
        | { success: true; amount: number }
        | { success: false; amount: number }

      const chargeHint = (type: HintType): ChargeHintResult => {
        const state = get()
        const usageCount = state.hints[type]
        const cost = state.freeHints ? 0 : getHintCostForUsage(type, usageCount)
        if (cost <= 0) {
          return { success: true, amount: 0 }
        }
        const spendCoins = useProgressStore.getState().spendCoins
        const success = spendCoins(cost)
        if (!success) {
          return { success: false, amount: cost }
        }
        return { success: true, amount: cost }
      }

      return {
        status: 'idle',
        level: undefined,
        currentLevelId: undefined,
        columns: 4,
        tiles: [],
        reserveTiles: [],
        completedGroups: [],
        hints: createInitialHints(),
        hintState: createInitialHintState(),
        groupColors: {},
        activeTile: undefined,
        revealedCategories: [],
        tileColorOverrides: {},
        freeHints: false,
        initialize: (level, levelId, options) => {
          const state = get()
          const columns = level.board?.columns ?? 4
          
          // 检查版本号，如果不匹配则强制重新初始化
          const versionMismatch = 
            state.level?.version !== undefined && 
            level.version !== undefined && 
            state.level.version !== level.version
          
          // 验证进度快照中的completedGroupIds是否与当前关卡的groups匹配
          const progressSnapshot = useProgressStore.getState().progress.levelSnapshots[levelId]
          let validatedFreeHints = !!options?.freeHints
          if (progressSnapshot?.completed && progressSnapshot.completedGroupIds.length > 0) {
            const validGroupIds = new Set(level.groups.map((g) => g.id))
            const isValid = progressSnapshot.completedGroupIds.every((id) => validGroupIds.has(id))
            if (!isValid) {
              // 快照数据与当前关卡不匹配，清除completed标记
              useProgressStore.getState().updateLevelSnapshot(levelId, (snapshot) => ({
                ...snapshot,
                completed: false,
                completedAt: undefined,
                coinsEarned: 0,
                completedGroupIds: [],
              }))
              validatedFreeHints = false
            } else {
              validatedFreeHints = true
            }
          }
          
          const shouldResume =
            !options?.forceRestart &&
            !versionMismatch &&
            state.currentLevelId === levelId &&
            state.status !== 'idle' &&
            state.status !== 'completed' &&
            state.tiles.length > 0
          const harmonizedGroupColors = harmonizeGroupColors(level, state.groupColors)
          const harmonizedOverrides = harmonizeTileOverrides(
            level,
            state.tiles,
            state.tileColorOverrides,
          )

          if (shouldResume) {
            const maxVisible = columns * MAX_VISIBLE_ROWS
            const overflow = state.tiles.slice(maxVisible)
            const initialVisible = state.tiles.slice(0, maxVisible)
            const initialReserve = Array.isArray(state.reserveTiles)
              ? state.reserveTiles
              : []
            const mergedReserve = [...overflow, ...initialReserve]
            const { tiles: normalizedTiles, reserveTiles: normalizedReserve } = fillVisibleTiles(
              initialVisible,
              mergedReserve,
              columns,
            )
            set({
              level,
              columns,
              currentLevelId: levelId,
              tiles: normalizedTiles,
              reserveTiles: normalizedReserve,
              groupColors: harmonizedGroupColors,
              tileColorOverrides: harmonizedOverrides,
              freeHints: validatedFreeHints,
            })
            return
          }

          const maxVisible = columns * MAX_VISIBLE_ROWS
          // 使用智能选择：优先选择完整的主题组
          const { visible: initialVisible, reserve: initialReserve } = createSmartInitialTiles(
            level,
            maxVisible,
          )
          const { tiles: preparedTiles, reserveTiles: preparedReserve } = fillVisibleTiles(
            initialVisible,
            initialReserve,
            columns,
          )

          set({
            status: 'ready',
            level,
            currentLevelId: levelId,
            columns,
            tiles: preparedTiles,
            reserveTiles: preparedReserve,
            completedGroups: [],
            hints: createInitialHints(),
            hintState: createInitialHintState(),
            groupColors: harmonizeGroupColors(level, {}),
            activeTile: undefined,
            revealedCategories: [],
            tileColorOverrides: {},
            freeHints: validatedFreeHints,
          })
        },
        reorder: (from, to) => {
          const state = get()
          if (state.status === 'idle') return
          const origin = state.tiles[from]
          const target = state.tiles[to]
          if (origin?.status !== 'available' || target?.status !== 'available') {
            return
          }
          const nextTiles = swapTiles(state.tiles, from, to)
          set({ tiles: nextTiles })
          const completedIds = new Set(state.completedGroups.map((group) => group.group.id))
          const matches = findMatches(nextTiles, state.columns, completedIds)
          if (matches.length > 0) {
            applyMatches(matches)
          }
        },
        selectTile: (tileId) => {
          const state = get()
          const tile = state.tiles.find((item) => item.instanceId === tileId)
          set({ activeTile: tile })
        },
        useGroupHint: () => {
          const state = get()
          if (!state.level) return { success: false as const, reason: 'no-groups' as const }
          const completedIds = new Set(state.completedGroups.map((group) => group.group.id))
          const availableGroups = state.level.groups.filter((group) => !completedIds.has(group.id))
          if (availableGroups.length === 0) {
            return { success: false as const, reason: 'no-groups' as const }
          }
          const charge = chargeHint('group')
          if (!charge.success) {
            return { success: false as const, reason: 'insufficient-coins' as const }
          }
          const revealedSet = new Set(state.revealedCategories)
          const prioritized = availableGroups.filter((group) => !revealedSet.has(group.id))
          const pool = prioritized.length > 0 ? prioritized : availableGroups
          const group = pool[Math.floor(Math.random() * pool.length)]
          const availableTiles = state.tiles.filter(
            (tile) => tile.groupId === group.id && tile.status === 'available',
          )
          if (availableTiles.length === 0) {
            if (charge.amount > 0) {
              useProgressStore.getState().refundCoins(charge.amount)
            }
            return { success: false as const, reason: 'no-groups' as const }
          }
          const pickedTile = availableTiles[Math.floor(Math.random() * availableTiles.length)]
          const sampleTile = pickedTile.data
          const definitionLanguages =
            useProgressStore.getState().progress.languagePreferences.definitions
          const preferredLanguage = definitionLanguages[0]
          const updatedRevealed = new Set(state.revealedCategories)
          updatedRevealed.add(group.id)
          set({
            hints: {
              ...state.hints,
              group: state.hints.group + 1,
            },
            hintState: {
              ...state.hintState,
              highlightedGroupId: group.id,
              highlightedTileIds: [pickedTile.instanceId],
              highlightContext: 'hint',
              pendingRowInspection: false,
              tileHighlightPresets: {},
            },
            revealedCategories: Array.from(updatedRevealed),
          })
          return {
            success: true as const,
            groupId: group.id,
            tileIds: [pickedTile.instanceId],
            category: group.category,
            sample: {
              text: sampleTile?.text,
              translation: pickTranslation(sampleTile?.text, preferredLanguage),
            },
          }
        },
        useAutoComplete: () => {
          const state = get()
          if (!state.level) return { success: false as const, reason: 'no-groups' as const }
          const completedIds = new Set(state.completedGroups.map((group) => group.group.id))
          const availableGroups = state.level.groups.filter((group) => !completedIds.has(group.id))
          if (availableGroups.length === 0) {
            return { success: false as const, reason: 'no-groups' as const }
          }
          const charge = chargeHint('autoComplete')
          if (!charge.success) {
            return { success: false as const, reason: 'insufficient-coins' as const }
          }

          const allTilesByGroup = new Map<string, TileInstance[]>()
          const availableTilesByGroup = new Map<string, TileInstance[]>()

          state.tiles.forEach((tile) => {
            if (!tile.groupId) return
            if (!allTilesByGroup.has(tile.groupId)) {
              allTilesByGroup.set(tile.groupId, [])
            }
            allTilesByGroup.get(tile.groupId)!.push(tile)
            if (tile.status === 'available') {
              if (!availableTilesByGroup.has(tile.groupId)) {
                availableTilesByGroup.set(tile.groupId, [])
              }
              availableTilesByGroup.get(tile.groupId)!.push(tile)
            }
          })

          const visibleAvailableCount = (groupId: string) =>
            availableTilesByGroup.get(groupId)?.length ?? 0

          const hasVisibleTiles = (groupId: string) => visibleAvailableCount(groupId) > 0

          const requiredCount = state.columns

          const fullyVisibleGroups = availableGroups.filter(
            (group) => visibleAvailableCount(group.id) >= requiredCount,
          )

          const partiallyVisibleGroups = availableGroups.filter(
            (group) =>
              hasVisibleTiles(group.id) && visibleAvailableCount(group.id) < requiredCount,
          )

          const pickGroupByCoverage = (groups: typeof availableGroups) => {
            let bestGroups: typeof groups = []
            let bestCount = -1
            groups.forEach((candidate) => {
              const count = visibleAvailableCount(candidate.id)
              if (count > bestCount) {
                bestCount = count
                bestGroups = [candidate]
                return
              }
              if (count === bestCount) {
                bestGroups.push(candidate)
              }
            })
            const pool = bestGroups.length > 0 ? bestGroups : groups
            return pool[Math.floor(Math.random() * pool.length)]
          }

          const selectionPool =
            fullyVisibleGroups.length > 0
              ? fullyVisibleGroups
              : partiallyVisibleGroups.length > 0
              ? partiallyVisibleGroups
              : availableGroups

          const group = pickGroupByCoverage(selectionPool)
          const visibleTiles =
            availableTilesByGroup.get(group.id) ?? allTilesByGroup.get(group.id) ?? []
          const tileIds =
            visibleTiles.length > 0
              ? visibleTiles.map((tile) => tile.instanceId)
              : state.tiles.filter((tile) => tile.groupId === group.id).map((tile) => tile.instanceId)
          assignGroupColor(group.id)
          const updatedRevealed = new Set(state.revealedCategories)
          updatedRevealed.add(group.id)
          set({
            hints: {
              ...state.hints,
              autoComplete: state.hints.autoComplete + 1,
            },
            hintState: {
              ...state.hintState,
              highlightedGroupId: group.id,
              highlightedTileIds: tileIds,
              highlightContext: 'assemble',
              pendingRowInspection: false,
            tileHighlightPresets: {},
            },
            revealedCategories: Array.from(updatedRevealed),
          })
          return { success: true as const, groupId: group.id, category: group.category, tileIds }
        },
        revealTheme: () => {
          const state = get()
          if (!state.level) return { success: false as const, reason: 'no-groups' as const }
          const charge = chargeHint('theme')
          if (!charge.success) {
            return { success: false as const, reason: 'insufficient-coins' as const }
          }
          const groups = state.level.groups
          if (groups.length === 0) {
            if (charge.amount > 0) {
              useProgressStore.getState().refundCoins(charge.amount)
            }
            return { success: false as const, reason: 'no-groups' as const }
          }
          const revealedSet = new Set(state.revealedCategories)
          const unrevealedGroups = shuffle(groups.filter((group) => !revealedSet.has(group.id)))
          const revealedGroups = shuffle(groups.filter((group) => revealedSet.has(group.id)))
          const ordered = [...unrevealedGroups, ...revealedGroups]
          const pickedGroups = ordered.slice(0, Math.min(2, ordered.length))
          const picks = pickedGroups.map((group) => group.category)
          const updatedRevealed = new Set(state.revealedCategories)
          pickedGroups.forEach((group) => updatedRevealed.add(group.id))
          set({
            hints: {
              ...state.hints,
              theme: state.hints.theme + 1,
            },
            hintState: {
              ...state.hintState,
              pendingRowInspection: false,
            },
            revealedCategories: Array.from(updatedRevealed),
          })
          return { success: true as const, topics: picks }
        },
        beginRowVerification: () => {
          const state = get()
          if (state.hintState.pendingRowInspection) {
            return { success: false as const, reason: 'pending' as const }
          }
          const charge = chargeHint('verify')
          if (!charge.success) {
            return { success: false as const, reason: 'insufficient-coins' as const }
          }
          set({
            hints: {
              ...state.hints,
              verify: state.hints.verify + 1,
            },
            hintState: {
              ...state.hintState,
              pendingRowInspection: true,
              highlightedGroupId: undefined,
              highlightedTileIds: [],
              highlightContext: undefined,
            tileHighlightPresets: {},
            },
          })
          return { success: true as const }
        },
        verifyRow: (rowIndex) => {
          const state = get()
          if (!state.level) {
            return { success: false, tileIds: [], reason: 'not-ready' as const }
          }
          if (!state.hintState.pendingRowInspection) {
            return { success: false, tileIds: [], reason: 'not-ready' as const }
          }
          const rowStart = rowIndex * state.columns
          const rowTiles = state.tiles.slice(rowStart, rowStart + state.columns)
          if (rowTiles.length < state.columns) {
            set({
              hintState: {
                ...state.hintState,
                pendingRowInspection: false,
                highlightedTileIds: [],
                highlightContext: undefined,
                tileHighlightPresets: {},
                lastVerification: { rowIndex, success: false },
              },
            })
            return { success: false, tileIds: [], reason: 'invalid-row' as const }
          }
          const tileIds = rowTiles.map((tile) => tile.instanceId)
          const baseGroupId = rowTiles[0]?.groupId
          const success = !!baseGroupId && rowTiles.every((tile) => tile.groupId === baseGroupId)
          const tileHighlightPresets: Record<string, string> = {}
          const overrides = { ...state.tileColorOverrides }
          const definedColorMap = new Map(
            (state.level?.groups ?? [])
              .map((group) => [group.id, group.colorPreset])
              .filter((entry): entry is [string, string] => Boolean(entry[1])),
          )
          rowTiles.forEach((tile) => {
            if (!tile.groupId) return
            const presetId =
              state.groupColors[tile.groupId] ??
              definedColorMap.get(tile.groupId) ??
              resolvePresetId(tile.groupId)
            tileHighlightPresets[tile.instanceId] = presetId
            overrides[tile.instanceId] = presetId
          })
          let nextRevealed = state.revealedCategories
          if (success && baseGroupId && !state.revealedCategories.includes(baseGroupId)) {
            const updated = new Set(state.revealedCategories)
            updated.add(baseGroupId)
            nextRevealed = Array.from(updated)
          }
          set({
            hintState: {
              ...state.hintState,
              pendingRowInspection: false,
              highlightedGroupId: success ? baseGroupId : undefined,
              highlightedTileIds: tileIds,
              highlightContext: success ? 'verify-reveal-success' : 'verify-reveal-fail',
              tileHighlightPresets,
              lastVerification: { rowIndex, success, groupId: success ? baseGroupId : undefined },
            },
            revealedCategories: nextRevealed,
            tileColorOverrides: overrides,
          })
          return { success, tileIds, groupId: success ? baseGroupId : undefined }
        },
        clearHighlights: () => {
          resetHighlightsState()
        },
        reset: () => {
          resetState()
        },
        clearSession: (levelId) => {
          const state = get()
          if (levelId && state.currentLevelId && state.currentLevelId !== levelId) {
            return
          }
          resetState()
        },
      }
    },
    {
      name: SESSION_STORAGE_KEY,
      storage: sessionStorage,
      partialize: (state) => ({
        status: state.status,
        level: state.level,
        currentLevelId: state.currentLevelId,
        columns: state.columns,
        tiles: state.tiles,
        reserveTiles: state.reserveTiles,
        completedGroups: state.completedGroups,
        hints: state.hints,
        hintState: state.hintState,
        groupColors: state.groupColors,
        revealedCategories: state.revealedCategories,
        tileColorOverrides: state.tileColorOverrides,
        freeHints: state.freeHints,
      }),
    },
  ),
)
