import type { TranslationMap } from './language'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface LevelLanguageProfile {
  game: {
    default: string
    options: string[]
  }
  definitions: {
    defaults: string[]
    options: string[]
    min?: number
    max?: number
  }
}

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
  languageProfile?: LevelLanguageProfile
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
