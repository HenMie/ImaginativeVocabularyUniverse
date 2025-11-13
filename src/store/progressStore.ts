import { create } from 'zustand'
import {
  CURRENT_PROGRESS_VERSION,
  type LanguagePreferences,
  type LevelProgressSnapshot,
  type PlayerProgress,
} from '../types/progress'
import { getTotalHintCostForUsage, type HintCostKey } from '../constants/economy'
import {
  DEFAULT_DEFINITION_LANGUAGES,
  DEFAULT_GAME_LANGUAGE,
  MAX_DEFINITION_LANGUAGES,
  MIN_DEFINITION_LANGUAGES,
} from '../constants/languages'
import {
  fetchRemoteProgress,
  persistRemoteProgress,
  upsertUserLevelProgressRecord,
} from '../services/playerProgressService'

const normalizeLanguageCode = (code: string | undefined, fallback: string) => {
  if (!code) return fallback
  const trimmed = code.trim()
  return trimmed.length ? trimmed : fallback
}

const normalizeDefinitionLanguages = (codes?: string[], fallback = DEFAULT_DEFINITION_LANGUAGES) => {
  const pool = Array.isArray(codes) ? codes : []
  const sanitized = Array.from(
    new Set(pool.map((code) => code?.trim()).filter((code): code is string => Boolean(code))),
  )
  if (!sanitized.length) {
    return [...fallback]
  }
  return sanitized.slice(0, MAX_DEFINITION_LANGUAGES)
}

const makeDefaultLanguagePreferences = (): LanguagePreferences => ({
  game: DEFAULT_GAME_LANGUAGE,
  definitions: [...DEFAULT_DEFINITION_LANGUAGES],
})

const resolveLanguagePreferences = (
  base?: LanguagePreferences,
  next?: Partial<LanguagePreferences> & { translation?: string },
  legacyTranslation?: string,
): LanguagePreferences => {
  const candidate: Partial<LanguagePreferences> & { translation?: string } = {
    ...(base ?? {}),
    ...(next ?? {}),
  }
  if ((!candidate.definitions || candidate.definitions.length === 0) && candidate.translation) {
    candidate.definitions = [candidate.translation]
  }
  if ((!candidate.definitions || candidate.definitions.length === 0) && legacyTranslation) {
    candidate.definitions = [legacyTranslation]
  }
  let definitions = normalizeDefinitionLanguages(candidate.definitions)
  if (definitions.length < MIN_DEFINITION_LANGUAGES) {
    const fallback = DEFAULT_DEFINITION_LANGUAGES.filter(
      (code) => !definitions.includes(code),
    )
    definitions = [...definitions, ...fallback]
  }
  if (!definitions.length) {
    definitions = [...DEFAULT_DEFINITION_LANGUAGES]
  }
  return {
    game: normalizeLanguageCode(candidate.game, DEFAULT_GAME_LANGUAGE),
    definitions: definitions.slice(0, MAX_DEFINITION_LANGUAGES),
  }
}

const makeDefaultProgress = (): PlayerProgress => ({
  version: CURRENT_PROGRESS_VERSION,
  coins: 120,
  experience: 0,
  unlockedLevelIds: ['level-001'],
  languagePreferences: makeDefaultLanguagePreferences(),
  seenTutorials: [],
  levelSnapshots: {},
  settings: {
    soundEnabled: true,
    hapticsEnabled: true,
    showRomanization: false,
  },
  lastBackupAt: undefined,
})

const createDefaultSnapshot = (levelId: string): LevelProgressSnapshot => ({
  levelId,
  completedGroupIds: [],
  remainingTileIds: [],
  hintsUsed: {},
  hintCosts: {},
  lastPlayedAt: new Date().toISOString(),
  coinsEarned: 0,
  completed: false,
})

const normalizeSnapshot = (
  levelId: string,
  snapshot?: Partial<LevelProgressSnapshot> & Record<string, unknown>,
): LevelProgressSnapshot => {
  if (!snapshot) {
    return createDefaultSnapshot(levelId)
  }
  const base = createDefaultSnapshot(levelId)
  const completedGroupIds = Array.isArray(snapshot.completedGroupIds)
    ? [...snapshot.completedGroupIds]
    : base.completedGroupIds
  const remainingTileIds = Array.isArray(snapshot.remainingTileIds)
    ? [...snapshot.remainingTileIds]
    : base.remainingTileIds
  const hintsUsed =
    snapshot.hintsUsed && typeof snapshot.hintsUsed === 'object'
      ? { ...base.hintsUsed, ...(snapshot.hintsUsed as Record<string, number>) }
      : base.hintsUsed
  const hintCosts =
    snapshot.hintCosts && typeof snapshot.hintCosts === 'object'
      ? { ...base.hintCosts, ...(snapshot.hintCosts as Record<string, number>) }
      : base.hintCosts
  const legacyStars = Number((snapshot as Record<string, unknown>).starsEarned ?? 0)
  const completed =
    typeof snapshot.completed === 'boolean'
      ? snapshot.completed
      : legacyStars > 0
  const lastPlayedAt =
    typeof snapshot.lastPlayedAt === 'string' ? snapshot.lastPlayedAt : base.lastPlayedAt
  const coinsEarned =
    typeof snapshot.coinsEarned === 'number' ? snapshot.coinsEarned : base.coinsEarned
  const completedAt =
    completed && typeof snapshot.completedAt === 'string'
      ? snapshot.completedAt
      : completed
      ? lastPlayedAt
      : undefined

  const normalized: LevelProgressSnapshot = {
    levelId,
    completedGroupIds,
    remainingTileIds,
    hintsUsed,
    hintCosts,
    lastPlayedAt,
    coinsEarned,
    completed,
    completedAt,
  }

  if (typeof snapshot.bestTimeMs === 'number') {
    normalized.bestTimeMs = snapshot.bestTimeMs
  }

  return normalized
}

const mergeProgress = (base: PlayerProgress, restored?: Partial<PlayerProgress>): PlayerProgress => {
  if (!restored) {
    return base
  }

  const normalizedSnapshots = Object.entries(restored.levelSnapshots ?? {}).reduce<
    Record<string, LevelProgressSnapshot>
  >((acc, [levelId, snapshot]) => {
    acc[levelId] = normalizeSnapshot(
      levelId,
      snapshot as Partial<LevelProgressSnapshot> & Record<string, unknown>,
    )
    return acc
  }, {})
  const unlockedSet = new Set([
    ...base.unlockedLevelIds,
    ...(restored.unlockedLevelIds ?? []),
  ])
  if (!unlockedSet.size) {
    unlockedSet.add('level-001')
  }
  const merged: PlayerProgress = {
    ...base,
    ...restored,
    version: CURRENT_PROGRESS_VERSION,
    coins: restored.coins ?? base.coins,
    experience: restored.experience ?? base.experience,
    unlockedLevelIds: Array.from(unlockedSet),
    levelSnapshots: {
      ...base.levelSnapshots,
      ...normalizedSnapshots,
    },
    settings: {
      ...base.settings,
      ...(restored.settings ?? {}),
    },
    lastBackupAt: restored.lastBackupAt ?? base.lastBackupAt,
    lastOnlineAt: restored.lastOnlineAt ?? base.lastOnlineAt,
  }
  merged.languagePreferences = resolveLanguagePreferences(
    base.languagePreferences,
    restored.languagePreferences,
    (restored as { activeLanguage?: string })?.activeLanguage,
  )
  return merged
}

interface ProgressState {
  progress: PlayerProgress
  loading: boolean
  initialized: boolean
  debugMode: boolean
  error: string | null
  userId?: string
  setProgress: (data: Partial<PlayerProgress>) => void
  resetProgress: () => void
  initialize: (userId: string) => Promise<void>
  setGameLanguage: (code: string) => void
  setDefinitionLanguages: (codes: string[]) => void
  updateLevelSnapshot: (
    levelId: string,
    updater: (snapshot: LevelProgressSnapshot) => LevelProgressSnapshot,
  ) => void
  completeLevel: (params: {
    levelId: string
    completedGroupIds: string[]
    coinsReward: number
    hintsUsed: Record<string, number>
    unlockLevelId?: string | null
    freeHintMode?: boolean
    completionTimeMs?: number
  }) => void
  spendCoins: (amount: number) => boolean
  refundCoins: (amount: number) => void
  markTutorialSeen: (tutorialId: string) => void
  toggleDebugMode: () => void
  isLevelUnlocked: (levelId: string) => boolean
}

export const useProgressStore = create<ProgressState>((set, get) => {
  // 直接实时保存到云端
  const persistToCloud = async () => {
    const { userId, progress } = get()
    if (!userId) {
      return
    }
    try {
      await persistRemoteProgress(userId, progress)
    } catch (error) {
      console.error('保存云端进度失败', error)
    }
  }

  const applyProgressUpdate = (updater: (progress: PlayerProgress) => PlayerProgress) => {
    set((state) => ({
      progress: updater(state.progress),
    }))
    // 直接实时保存
    void persistToCloud()
  }

  return {
    progress: makeDefaultProgress(),
    loading: false,
    initialized: false,
    debugMode: false,
    error: null,
    userId: undefined,
    setProgress: (data) => {
      applyProgressUpdate((current) => {
        const legacyTranslation = (data as { activeLanguage?: string })?.activeLanguage
        const nextPreferences = resolveLanguagePreferences(
          current.languagePreferences,
          data.languagePreferences,
          legacyTranslation,
        )
        return {
          ...current,
          ...data,
          languagePreferences: nextPreferences,
          settings: {
            ...current.settings,
            ...(data.settings ?? {}),
          },
          version: CURRENT_PROGRESS_VERSION,
        }
      })
    },
    resetProgress: () => {
      set({
        progress: makeDefaultProgress(),
        initialized: false,
        userId: undefined,
      })
    },
    initialize: async (userId: string) => {
      if (!userId) {
        return
      }
      set({ loading: true, error: null, userId })
      try {
        const snapshot = await fetchRemoteProgress(userId)
        const base = makeDefaultProgress()
        let progress = mergeProgress(base, snapshot?.payload ?? undefined)
        if (snapshot) {
          progress = {
            ...progress,
            coins: snapshot.coins ?? progress.coins,
            experience: snapshot.experience ?? progress.experience,
            lastOnlineAt: snapshot.lastOnlineAt ?? progress.lastOnlineAt,
          }
        }
        set({
          progress,
          loading: false,
          initialized: true,
        })
      } catch (error) {
        console.error('初始化云端进度失败', error)
        set({
          loading: false,
          error: (error as Error).message,
        })
      }
    },
    setGameLanguage: (code) => {
      applyProgressUpdate((current) => {
        const nextPreferences = resolveLanguagePreferences(current.languagePreferences, {
          game: code,
        })
        if (nextPreferences.game === current.languagePreferences.game) {
          return current
        }
        return {
          ...current,
          languagePreferences: nextPreferences,
        }
      })
    },
    setDefinitionLanguages: (codes) => {
      applyProgressUpdate((current) => {
        const nextPreferences = resolveLanguagePreferences(current.languagePreferences, {
          definitions: codes,
        })
        return {
          ...current,
          languagePreferences: nextPreferences,
        }
      })
    },
    updateLevelSnapshot: (levelId, updater) => {
      applyProgressUpdate((current) => {
        const prevSnapshot = current.levelSnapshots[levelId] ?? createDefaultSnapshot(levelId)
        const nextSnapshot = updater(prevSnapshot)
        return {
          ...current,
          levelSnapshots: {
            ...current.levelSnapshots,
            [levelId]: nextSnapshot,
          },
        }
      })
    },
    completeLevel: ({
      levelId,
      completedGroupIds,
      coinsReward,
      hintsUsed,
      unlockLevelId,
      freeHintMode,
      completionTimeMs,
    }) => {
      const now = new Date().toISOString()
      let latestBestTime: number | undefined
      applyProgressUpdate((current) => {
        const snapshot = current.levelSnapshots[levelId] ?? createDefaultSnapshot(levelId)
        const hintCosts = Object.entries(hintsUsed).reduce<Record<string, number>>(
          (acc, [type, count]) => {
            if (count > 0) {
              const hintKey = type as HintCostKey
              const cost = freeHintMode ? 0 : getTotalHintCostForUsage(hintKey, count)
              acc[hintKey] = (acc[hintKey] ?? 0) + cost
            }
            return acc
          },
          snapshot.hintCosts ? { ...snapshot.hintCosts } : {},
        )

        const bestTimeMs =
          typeof completionTimeMs === 'number'
            ? Math.min(snapshot.bestTimeMs ?? completionTimeMs, completionTimeMs)
            : snapshot.bestTimeMs
        latestBestTime = bestTimeMs ?? undefined

        const updatedSnapshot: LevelProgressSnapshot = {
          ...snapshot,
          completedGroupIds,
          remainingTileIds: [],
          hintsUsed: {
            ...snapshot.hintsUsed,
            ...hintsUsed,
          },
          hintCosts,
          coinsEarned: snapshot.coinsEarned + coinsReward,
          completed: true,
          completedAt: snapshot.completedAt ?? now,
          lastPlayedAt: now,
        }
        if (typeof bestTimeMs === 'number') {
          updatedSnapshot.bestTimeMs = bestTimeMs
        }

        const unlockedSet = new Set([...current.unlockedLevelIds, levelId])
        if (unlockLevelId) {
          unlockedSet.add(unlockLevelId)
        }

        return {
          ...current,
          coins: current.coins + coinsReward,
          experience: current.experience + coinsReward,
          unlockedLevelIds: Array.from(unlockedSet),
          levelSnapshots: {
            ...current.levelSnapshots,
            [levelId]: updatedSnapshot,
          },
        }
      })

      const { userId } = get()
      if (userId) {
        void upsertUserLevelProgressRecord(userId, levelId, {
          status: 'completed',
          bestScore: coinsReward,
          bestTimeMs: latestBestTime ?? null,
          lastPlayedAt: now,
        }).catch((error) => {
          console.error('更新关卡进度失败', error)
        })
      }
    },
    spendCoins: (amount) => {
      if (amount <= 0) return true
      const state = get()
      if (state.debugMode) return true
      if (state.progress.coins < amount) {
        return false
      }
      applyProgressUpdate((current) => ({
        ...current,
        coins: current.coins - amount,
      }))
      return true
    },
    refundCoins: (amount) => {
      if (amount <= 0) return
      applyProgressUpdate((current) => ({
        ...current,
        coins: current.coins + amount,
      }))
    },
    markTutorialSeen: (tutorialId) => {
      applyProgressUpdate((current) => {
        if (current.seenTutorials.includes(tutorialId)) {
          return current
        }
        return {
          ...current,
          seenTutorials: [...current.seenTutorials, tutorialId],
        }
      })
    },
    toggleDebugMode: () =>
      set((state) => ({
        debugMode: !state.debugMode,
      })),
    isLevelUnlocked: (levelId: string) => {
      const state = get()
      if (state.debugMode) return true
      return state.progress.unlockedLevelIds.includes(levelId)
    },
  }
})
