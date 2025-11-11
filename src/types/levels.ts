import type { TranslationMap } from './language'

export type Difficulty = 'easy' | 'medium' | 'hard'

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

export interface LevelMetadata {
  id: string
  difficulty: Difficulty
  version: number
  language: string[]
  tutorialSteps?: TranslationMap[]
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
