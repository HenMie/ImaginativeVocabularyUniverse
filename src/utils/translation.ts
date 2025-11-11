import type { TranslationMap } from '../types/language'
import type { TileDefinition } from '../types/levels'

/**
 * Picks the best translation for the preferred language with graceful fallbacks.
 */
export const pickTranslation = (
  translations: TranslationMap | undefined,
  preferredLanguage?: string,
  fallbackLanguages?: string[],
): string => {
  if (!translations) {
    return '—'
  }
  if (preferredLanguage && translations[preferredLanguage]) {
    return translations[preferredLanguage]
  }
  const fallbacks = fallbackLanguages ?? ['zh']
  for (const fallback of fallbacks) {
    if (fallback && translations[fallback]) {
      return translations[fallback]
    }
  }
  const firstEntry = Object.values(translations)[0]
  return firstEntry ?? '—'
}

/**
 * Returns the best text to display on a tile for the given game language.
 * 适配新的数据结构，直接从 text 字段获取多语言文本
 */
export const getTileDisplayText = (
  tile: Pick<TileDefinition, 'text'>,
  preferredLanguage?: string,
): string => {
  if (!tile) return '—'
  return pickTranslation(tile.text, preferredLanguage)
}

/**
 * 获取词牌的提示文本
 */
export const getTileHintText = (
  tile: Pick<TileDefinition, 'hint'>,
  preferredLanguage?: string,
): string => {
  if (!tile || !tile.hint) return ''
  return pickTranslation(tile.hint, preferredLanguage)
}

/**
 * 获取分组的类别名称
 */
export const getCategoryText = (
  category: TranslationMap,
  preferredLanguage?: string,
): string => {
  return pickTranslation(category, preferredLanguage)
}

