import type { TranslationMap } from './language'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface TileDefinition {
  id: string
  languageCode: string
  text?: string
  hint?: string
  translations: TranslationMap
}

export interface GroupDefinition {
  id: string
  category: string
  colorPreset?: string
  tiles: TileDefinition[]
}

export interface LevelMetadata {
  id: string
  name: string
  difficulty: Difficulty
  version: number
  languageCodes: string[]
  tutorialSteps?: string[]
  board?: {
    columns?: number
  }
}

export interface LevelFile extends LevelMetadata {
  groups: GroupDefinition[]
}

export interface LevelIndexEntry {
  id: string
  name: string
  difficulty: Difficulty
  file: string
}

