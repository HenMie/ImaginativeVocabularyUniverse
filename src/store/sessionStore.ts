import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { LevelFile } from '../types/levels'
import { getHintCost } from '../constants/economy'
import { getGroupColorByIndex } from '../constants/groupColors'
import { useProgressStore } from './progressStore'
import { SESSION_STORAGE_KEY } from '../constants/storage'
import {
  buildCompletedGroup,
  createTileInstances,
  findMatches,
  groupLookup,
  swapTiles,
  type CompletedGroup,
  type MatchResult,
  type TileInstance,
} from '../utils/board'

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
  completedGroups: CompletedGroup[]
  hints: Record<HintType, number>
  hintState: HintState
  groupColors: Record<string, string>
  activeTile?: TileInstance
  revealedCategories: string[]
  tileColorOverrides: Record<string, string>
  initialize: (level: LevelFile, levelId: string, options?: { forceRestart?: boolean }) => void
  reorder: (from: number, to: number) => void
  selectTile: (tileId?: string) => void
  useGroupHint: () =>
    | {
        success: true
        groupId: string
        tileIds: string[]
        category: string
        sample: { text?: string; translation?: string }
      }
    | { success: false; reason: 'insufficient-coins' | 'no-groups' }
  useAutoComplete: () =>
    | {
        success: true
        groupId: string
        category: string
        tileIds: string[]
      }
    | { success: false; reason: 'insufficient-coins' | 'no-groups' }
  revealTheme: () =>
    | { success: true; topics: string[] }
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
  | 'completedGroups'
  | 'hints'
  | 'hintState'
  | 'groupColors'
  | 'revealedCategories'
  | 'tileColorOverrides'
>

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
          completedGroups: [],
          hints: createInitialHints(),
          hintState: createInitialHintState(),
          groupColors: {},
          activeTile: undefined,
          revealedCategories: [],
          tileColorOverrides: {},
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
        const markedTiles = state.tiles.map((tile) =>
          matchedIds.has(tile.instanceId) ? { ...tile, status: 'completed' as const } : tile,
        )
        const newlyCompleted = matches.map((match) =>
          buildCompletedGroup(grouped[match.groupId], state.tiles, match),
        )

        const completedGroups = [...state.completedGroups, ...newlyCompleted]
        const nextStatus =
          completedGroups.length === state.level.groups.length ? 'completed' : state.status

        const revealedSet = new Set(state.revealedCategories)
        matches.forEach((match) => {
          const category = grouped[match.groupId]?.category
          if (category) {
            revealedSet.add(category)
          }
          assignGroupColor(match.groupId)
        })

        set({
          tiles: markedTiles,
          completedGroups,
          status: nextStatus,
          hintState: {
            ...state.hintState,
            highlightedGroupId: undefined,
            highlightedTileIds: Array.from(matchedIds),
            highlightContext: 'complete',
            pendingRowInspection: false,
          tileHighlightPresets: {},
          },
          revealedCategories: Array.from(revealedSet),
        })
      }

      const chargeHint = (type: HintType) => {
        const spendCoins = useProgressStore.getState().spendCoins
        const cost = getHintCost(type)
        return spendCoins(cost)
      }

      return {
        status: 'idle',
        level: undefined,
        currentLevelId: undefined,
        columns: 4,
        tiles: [],
        completedGroups: [],
        hints: createInitialHints(),
        hintState: createInitialHintState(),
        groupColors: {},
        activeTile: undefined,
        revealedCategories: [],
        tileColorOverrides: {},
        initialize: (level, levelId, options) => {
          const state = get()
          const columns = level.board?.columns ?? 4
          const shouldResume =
            !options?.forceRestart &&
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
            set({
              level,
              columns,
              currentLevelId: levelId,
              groupColors: harmonizedGroupColors,
              tileColorOverrides: harmonizedOverrides,
            })
            return
          }

          const tiles = createTileInstances(level, true)

          set({
            status: 'ready',
            level,
            currentLevelId: levelId,
            columns,
            tiles,
            completedGroups: [],
            hints: createInitialHints(),
            hintState: createInitialHintState(),
            groupColors: harmonizeGroupColors(level, {}),
            activeTile: undefined,
            revealedCategories: [],
            tileColorOverrides: {},
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
          if (!chargeHint('group')) {
            return { success: false as const, reason: 'insufficient-coins' as const }
          }
          const revealedSet = new Set(state.revealedCategories)
          const prioritized = availableGroups.filter((group) => !revealedSet.has(group.category))
          const pool = prioritized.length > 0 ? prioritized : availableGroups
          const group = pool[Math.floor(Math.random() * pool.length)]
          const availableTiles = state.tiles.filter(
            (tile) => tile.groupId === group.id && tile.status === 'available',
          )
          if (availableTiles.length === 0) {
            useProgressStore.getState().refundCoins(getHintCost('group'))
            return { success: false as const, reason: 'no-groups' as const }
          }
          const pickedTile = availableTiles[Math.floor(Math.random() * availableTiles.length)]
          const sampleTile = pickedTile.data
          const updatedRevealed = new Set(state.revealedCategories)
          if (group.category) {
            updatedRevealed.add(group.category)
          }
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
              translation:
                sampleTile?.translations.zh ?? Object.values(sampleTile?.translations ?? {})[0],
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
          if (!chargeHint('autoComplete')) {
            return { success: false as const, reason: 'insufficient-coins' as const }
          }
          const group = availableGroups[Math.floor(Math.random() * availableGroups.length)]
          const tileIds = state.tiles
            .filter((tile) => tile.groupId === group.id)
            .map((tile) => tile.instanceId)
          assignGroupColor(group.id)
          const updatedRevealed = new Set(state.revealedCategories)
          if (group.category) {
            updatedRevealed.add(group.category)
          }
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
          if (!chargeHint('theme')) {
            return { success: false as const, reason: 'insufficient-coins' as const }
          }
          const topics = Array.from(
            new Set(state.level.groups.map((group) => group.category ?? '')),
          ).filter(Boolean)
          if (topics.length === 0) {
            return { success: false as const, reason: 'no-groups' as const }
          }
          const revealedSet = new Set(state.revealedCategories)
          const unrevealedTopics = shuffle(topics.filter((topic) => !revealedSet.has(topic)))
          const revealedTopics = shuffle(topics.filter((topic) => revealedSet.has(topic)))
          const ordered = [...unrevealedTopics, ...revealedTopics]
          const picks = ordered.slice(0, Math.min(2, ordered.length))
          const updatedRevealed = new Set(state.revealedCategories)
          picks.forEach((topic) => updatedRevealed.add(topic))
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
          if (!chargeHint('verify')) {
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
          if (success && baseGroupId) {
            const category =
              state.level?.groups.find((group) => group.id === baseGroupId)?.category ?? ''
            if (category && !state.revealedCategories.includes(category)) {
              const updated = new Set(state.revealedCategories)
              updated.add(category)
              nextRevealed = Array.from(updated)
            }
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
        completedGroups: state.completedGroups,
        hints: state.hints,
        hintState: state.hintState,
        groupColors: state.groupColors,
        revealedCategories: state.revealedCategories,
        tileColorOverrides: state.tileColorOverrides,
      }),
    },
  ),
)

