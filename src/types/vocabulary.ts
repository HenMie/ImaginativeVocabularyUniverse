/**
 * 生词本相关类型定义
 */

/**
 * 生词条目
 */
export interface VocabularyEntry {
  id: string
  userId: string
  word: string // 原文(游戏语言)
  translation: string // 中文释义
  language: string // 语言代码 (ko, ja, en等)
  levelId?: string | null
  groupCategory?: string | null
  tileId?: string | null
  addedAt: string
  lastReviewedAt?: string | null
  reviewCount: number
  notes?: string | null
  updatedAt?: string
}

/**
 * 按语言分组的生词本
 */
export interface VocabularyByLanguage {
  [languageCode: string]: VocabularyEntry[]
}

/**
 * 添加生词的输入参数
 */
export interface AddVocabularyInput {
  word: string
  translation: string
  language: string
  levelId?: string
  groupCategory?: string
  tileId?: string
  notes?: string
}

/**
 * 更新生词的输入参数
 */
export interface UpdateVocabularyInput {
  notes?: string
  translation?: string
}

/**
 * 生词统计信息
 */
export interface VocabularyStats {
  total: number
  byLanguage: Record<string, number>
  recentlyAdded: number // 最近7天添加的数量
  mostReviewed: VocabularyEntry[]
}

