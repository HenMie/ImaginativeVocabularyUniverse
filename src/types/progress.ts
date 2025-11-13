export interface LevelProgressSnapshot {
  levelId: string
  completedGroupIds: string[]
  remainingTileIds: string[]
  hintsUsed: Record<string, number>
  hintCosts?: Record<string, number>
  bestTimeMs?: number
  lastPlayedAt: string
  coinsEarned: number
  completed: boolean
  completedAt?: string
}

export interface LanguagePreferences {
  game: string
  definitions: string[]
}

export interface PlayerProgress {
  version: number
  coins: number
  experience: number
  unlockedLevelIds: string[]
  languagePreferences: LanguagePreferences
  seenTutorials: string[]
  levelSnapshots: Record<string, LevelProgressSnapshot>
  settings: {
    soundEnabled: boolean
    hapticsEnabled: boolean
    showRomanization: boolean
  }
  lastBackupAt?: string
  lastOnlineAt?: string
}

export const CURRENT_PROGRESS_VERSION = 4

