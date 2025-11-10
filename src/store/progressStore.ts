import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEY } from '../constants/storage'
import {
  CURRENT_PROGRESS_VERSION,
  type LevelProgressSnapshot,
  type PlayerProgress,
} from '../types/progress'
import { getTotalHintCostForUsage, type HintCostKey } from '../constants/economy'

const makeDefaultProgress = (): PlayerProgress => ({
  version: CURRENT_PROGRESS_VERSION,
  coins: 120,
  unlockedLevelIds: ['level-001'],
  activeLanguage: 'ko',
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

const storage = createJSONStorage<PlayerProgress>(() => {
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

interface ProgressState {
  progress: PlayerProgress
  debugMode: boolean
  setProgress: (data: Partial<PlayerProgress>) => void
  resetProgress: () => void
  importProgress: (payload: PlayerProgress) => void
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
  }) => void
  spendCoins: (amount: number) => boolean
  refundCoins: (amount: number) => void
  markTutorialSeen: (tutorialId: string) => void
  toggleDebugMode: () => void
  isLevelUnlocked: (levelId: string) => boolean
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: makeDefaultProgress(),
      debugMode: false,
      setProgress: (data) =>
        set((state) => ({
          progress: {
            ...state.progress,
            ...data,
            version: CURRENT_PROGRESS_VERSION,
            settings: {
              ...state.progress.settings,
              ...data.settings,
            },
          },
        })),
      resetProgress: () =>
        set({
          progress: makeDefaultProgress(),
        }),
      importProgress: (payload) =>
        set(() => ({
          progress: {
            ...makeDefaultProgress(),
            ...payload,
            version: CURRENT_PROGRESS_VERSION,
            settings: {
              ...makeDefaultProgress().settings,
              ...payload.settings,
            },
          },
        })),
      updateLevelSnapshot: (levelId, updater) =>
        set((state) => {
          const previous =
            state.progress.levelSnapshots[levelId] ?? createDefaultSnapshot(levelId)
          const next = updater(previous)
          return {
            progress: {
              ...state.progress,
              levelSnapshots: {
                ...state.progress.levelSnapshots,
                [levelId]: {
                  ...next,
                  levelId,
                  lastPlayedAt: new Date().toISOString(),
                },
              },
            },
          }
        }),
      completeLevel: ({
        levelId,
        completedGroupIds,
        coinsReward,
        hintsUsed,
        unlockLevelId,
        freeHintMode,
      }) => {
        set((state) => {
          const snapshot =
            state.progress.levelSnapshots[levelId] ?? createDefaultSnapshot(levelId)
          const hintCosts = Object.entries(hintsUsed).reduce<Record<string, number>>((acc, [type, count]) => {
            if (count > 0) {
              const hintKey = type as HintCostKey
              const cost = freeHintMode ? 0 : getTotalHintCostForUsage(hintKey, count)
              acc[hintKey] = (acc[hintKey] ?? 0) + cost
            }
            return acc
          }, snapshot.hintCosts ? { ...snapshot.hintCosts } : {})
          const now = new Date().toISOString()
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

          const unlockedSet = new Set([...state.progress.unlockedLevelIds, levelId])
          if (unlockLevelId) {
            unlockedSet.add(unlockLevelId)
          }

          return {
            progress: {
              ...state.progress,
              coins: state.progress.coins + coinsReward,
              unlockedLevelIds: Array.from(unlockedSet),
              levelSnapshots: {
                ...state.progress.levelSnapshots,
                [levelId]: updatedSnapshot,
              },
            },
          }
        })
      },
      spendCoins: (amount) => {
        if (amount <= 0) return true
        const state = get()
        // 调试模式下金币消耗总是成功
        if (state.debugMode) return true
        let success = false
        set((state) => {
          if (state.progress.coins < amount) {
            success = false
            return state
          }
          success = true
          return {
            progress: {
              ...state.progress,
              coins: state.progress.coins - amount,
            },
          }
        })
        return success
      },
      refundCoins: (amount) => {
        if (amount <= 0) return
        set((state) => ({
          progress: {
            ...state.progress,
            coins: state.progress.coins + amount,
          },
        }))
      },
      markTutorialSeen: (tutorialId) =>
        set((state) => {
          if (state.progress.seenTutorials.includes(tutorialId)) {
            return state
          }
          return {
            progress: {
              ...state.progress,
              seenTutorials: [...state.progress.seenTutorials, tutorialId],
            },
          }
        }),
      toggleDebugMode: () =>
        set((state) => ({
          debugMode: !state.debugMode,
        })),
      isLevelUnlocked: (levelId: string) => {
        const state = get()
        if (state.debugMode) return true
        return state.progress.unlockedLevelIds.includes(levelId)
      },
    }),
    {
      name: STORAGE_KEY,
      storage,
      version: CURRENT_PROGRESS_VERSION,
      partialize: (state) => state.progress as PlayerProgress,
      merge: (persisted, current) => {
        const restored = (persisted ?? {}) as PlayerProgress
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
          ...current.progress.unlockedLevelIds,
          ...(restored.unlockedLevelIds ?? []),
        ])
        if (!unlockedSet.size) {
          unlockedSet.add('level-001')
        }
        const mergedProgress: PlayerProgress = {
          ...current.progress,
          ...restored,
          version: CURRENT_PROGRESS_VERSION,
          coins: restored.coins ?? current.progress.coins,
          unlockedLevelIds: Array.from(unlockedSet),
          levelSnapshots: {
            ...current.progress.levelSnapshots,
            ...normalizedSnapshots,
          },
          settings: {
            ...current.progress.settings,
            ...(restored.settings ?? {}),
          },
        }
        return {
          ...current,
          progress: mergedProgress,
        }
      },
    },
  ),
)

