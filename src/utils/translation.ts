import type { TranslationMap } from '../types/language'
import type { TileDefinition, LevelLanguageProfile } from '../types/levels'
import type { LanguagePreferences } from '../types/progress'
import {
  DEFAULT_DEFINITION_LANGUAGES,
  MAX_DEFINITION_LANGUAGES,
  MIN_DEFINITION_LANGUAGES,
} from '../constants/languages'

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
 */
export const getTileDisplayText = (
  tile: Pick<TileDefinition, 'text' | 'languageCode' | 'translations'>,
  preferredLanguage?: string,
): string => {
  if (!tile) return '—'
  if (preferredLanguage && preferredLanguage === tile.languageCode && tile.text) {
    return tile.text
  }
  if (preferredLanguage && preferredLanguage !== tile.languageCode) {
    const alt = tile.translations?.[preferredLanguage]
    if (alt) {
      return alt
    }
  }
  if (tile.text) {
    return tile.text
  }
  return pickTranslation(tile.translations, preferredLanguage)
}

export const resolveEffectiveLanguages = (
  profile: LevelLanguageProfile | undefined,
  preferences: LanguagePreferences,
): { game: string; definitions: string[] } => {
  if (!profile) {
    return {
      game: preferences.game,
      definitions: preferences.definitions.length
        ? preferences.definitions
        : [...DEFAULT_DEFINITION_LANGUAGES],
    }
  }
  const allowedGame = profile.game.options?.length ? profile.game.options : [profile.game.default]
  const safeGame = allowedGame.includes(preferences.game) ? preferences.game : profile.game.default

  const allowedDefinitions =
    profile.definitions.options?.length && profile.definitions.options.length > 0
      ? profile.definitions.options
      : preferences.definitions
  const filteredDefinitions = preferences.definitions.filter((code) =>
    allowedDefinitions.includes(code),
  )
  let baseDefinitions =
    filteredDefinitions.length > 0
      ? filteredDefinitions
      : profile.definitions.defaults?.filter((code) => allowedDefinitions.includes(code)) ??
        allowedDefinitions.slice(0, profile.definitions.min ?? MIN_DEFINITION_LANGUAGES)

  if (!baseDefinitions.length) {
    baseDefinitions = allowedDefinitions.length
      ? allowedDefinitions
      : [...DEFAULT_DEFINITION_LANGUAGES]
  }

  const minDefinitions = profile.definitions.min ?? MIN_DEFINITION_LANGUAGES
  if (baseDefinitions.length < minDefinitions) {
    const extras = allowedDefinitions.filter((code) => !baseDefinitions.includes(code))
    baseDefinitions = [...baseDefinitions, ...extras]
  }
  if (!baseDefinitions.length) {
    baseDefinitions = [...DEFAULT_DEFINITION_LANGUAGES]
  }
  const maxDefinitions = profile.definitions.max ?? MAX_DEFINITION_LANGUAGES
  const limitedDefinitions =
    baseDefinitions.length > maxDefinitions ? baseDefinitions.slice(0, maxDefinitions) : baseDefinitions

  return {
    game: safeGame,
    definitions: limitedDefinitions,
  }
}
