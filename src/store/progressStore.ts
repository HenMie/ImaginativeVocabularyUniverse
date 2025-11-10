import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEY } from '../constants/storage'
import {
  CURRENT_PROGRESS_VERSION,
  type LevelProgressSnapshot,
  type PlayerProgress,
} from '../types/progress'
import { getHintCost, type HintCostKey } from '../constants/economy'

const makeDefaultProgress = (): PlayerProgress => ({
  version: CURRENT_PROGRESS_VERSION,
  coins: 120,
  totalStars: 0,
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
  starsEarned: 0,
  coinsEarned: 0,
})

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
    starsReward: number
    hintsUsed: Record<string, number>
  }) => void
  spendCoins: (amount: number) => boolean
  refundCoins: (amount: number) => void
  markTutorialSeen: (tutorialId: string) => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      progress: makeDefaultProgress(),
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
      completeLevel: ({ levelId, completedGroupIds, coinsReward, starsReward, hintsUsed }) => {
        set((state) => {
          const snapshot =
            state.progress.levelSnapshots[levelId] ?? createDefaultSnapshot(levelId)
          const starsEarned = Math.max(snapshot.starsEarned, starsReward)
          const hintCosts = Object.entries(hintsUsed).reduce<Record<string, number>>((acc, [type, count]) => {
            if (count > 0) {
              const hintKey = type as HintCostKey
              const cost = getHintCost(hintKey)
              acc[hintKey] = (acc[hintKey] ?? 0) + cost * count
            }
            return acc
          }, snapshot.hintCosts ? { ...snapshot.hintCosts } : {})
          const updatedSnapshot: LevelProgressSnapshot = {
            ...snapshot,
            completedGroupIds,
            remainingTileIds: [],
            hintsUsed: {
              ...snapshot.hintsUsed,
              ...hintsUsed,
            },
            hintCosts,
            starsEarned,
            coinsEarned: snapshot.coinsEarned + coinsReward,
            lastPlayedAt: new Date().toISOString(),
          }

          const totalStars =
            state.progress.totalStars - snapshot.starsEarned + starsEarned

          const unlockedLevelIds = Array.from(
            new Set([...state.progress.unlockedLevelIds, levelId]),
          )

          return {
            progress: {
              ...state.progress,
              coins: state.progress.coins + coinsReward,
              totalStars,
              unlockedLevelIds,
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
    }),
    {
      name: STORAGE_KEY,
      storage,
      version: CURRENT_PROGRESS_VERSION,
      partialize: (state) => state.progress as PlayerProgress,
      merge: (persisted, current) => {
        const restored = (persisted ?? {}) as PlayerProgress
        return {
          ...current,
          progress: {
            ...current.progress,
            ...restored,
            version: CURRENT_PROGRESS_VERSION,
            settings: {
              ...current.progress.settings,
              ...restored.settings,
            },
          },
        }
      },
    },
  ),
)

