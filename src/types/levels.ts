import type { TranslationMap } from './language'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface TileDefinition {
  id: string
  text: TranslationMap
  hint?: TranslationMap
}

export interface GroupDefinition {
  id: string
  category: TranslationMap
  colorPreset?: string
  tiles: TileDefinition[]
}

export interface LevelContent {
  tutorialSteps?: TranslationMap[]
  groups: GroupDefinition[]
  board?: {
    columns?: number
  }
  title?: TranslationMap
  description?: TranslationMap
}

export interface LevelRecord {
  id: string
  difficulty: Difficulty
  version: number
  language: string[]
  isPublished: boolean
  updatedAt: string
  content: LevelContent
  tutorialSteps?: TranslationMap[]
  board?: LevelContent['board']
  groups: GroupDefinition[]
}

export type LevelFile = LevelRecord

export interface LevelIndexEntry {
  id: string
  title: string
  difficulty: Difficulty
  language: string[]
  version: number
  isPublished: boolean
  updatedAt: string
}
