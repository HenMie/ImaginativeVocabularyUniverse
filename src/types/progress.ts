export interface LevelProgressSnapshot {
  levelId: string
  completedGroupIds: string[]
  remainingTileIds: string[]
  hintsUsed: Record<string, number>
  hintCosts?: Record<string, number>
  bestTimeMs?: number
  lastPlayedAt: string
  starsEarned: number
  coinsEarned: number
}

export interface PlayerProgress {
  version: number
  coins: number
  totalStars: number
  unlockedLevelIds: string[]
  activeLanguage: string
  seenTutorials: string[]
  levelSnapshots: Record<string, LevelProgressSnapshot>
  settings: {
    soundEnabled: boolean
    hapticsEnabled: boolean
    showRomanization: boolean
  }
  lastBackupAt?: string
}

export const CURRENT_PROGRESS_VERSION = 1

