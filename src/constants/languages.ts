import type { LevelLanguageProfile } from '../types/levels'

export const DEFAULT_GAME_LANGUAGE = 'ko'
export const DEFAULT_DEFINITION_LANGUAGES = ['zh']
export const MIN_DEFINITION_LANGUAGES = 1
export const MAX_DEFINITION_LANGUAGES = 3

export const DEFAULT_LEVEL_LANGUAGE_PROFILE: LevelLanguageProfile = {
  game: {
    default: DEFAULT_GAME_LANGUAGE,
    options: [DEFAULT_GAME_LANGUAGE],
  },
  definitions: {
    defaults: DEFAULT_DEFINITION_LANGUAGES,
    options: DEFAULT_DEFINITION_LANGUAGES,
    min: MIN_DEFINITION_LANGUAGES,
    max: MAX_DEFINITION_LANGUAGES,
  },
}
