import type { TranslationMap } from './language'

export type TileDisplayType = 'word' | 'image' | 'hybrid'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface TileDefinition {
  id: string
  languageCode: string
  text?: string
  imageSrc?: string
  hint?: string
  translations: TranslationMap
}

export interface GroupDefinition {
  id: string
  category: string
  type: TileDisplayType
  colorPreset?: string
  tiles: TileDefinition[]
  /**
   * 完成该组后生成的新 tile（可选，用于图片块或进阶玩法）
   */
  resultTile?: TileDefinition
}

export interface LevelMetadata {
  id: string
  name: string
  theme: string
  difficulty: Difficulty
  version: number
  rewards: {
    coins: number
    stars: number
  }
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
  requiredStars: number
  difficulty: Difficulty
  rewards: {
    coins: number
    stars: number
  }
  file: string
  preview?: {
    highlightGroup?: string
    coverImage?: string
  }
}

