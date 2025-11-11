import type { LevelFile, LevelIndexEntry } from '../types/levels'
import {
  DEFAULT_DEFINITION_LANGUAGES,
  DEFAULT_GAME_LANGUAGE,
  DEFAULT_LEVEL_LANGUAGE_PROFILE,
  MAX_DEFINITION_LANGUAGES,
  MIN_DEFINITION_LANGUAGES,
} from '../constants/languages'

const INDEX_PATH = '/levels/index.json'

const levelCache = new Map<string, LevelFile>()
let cachedIndex: LevelIndexEntry[] | null = null

const ensureResponse = async (response: Response, resource: string) => {
  if (!response.ok) {
    throw new Error(`加载资源失败: ${resource}（${response.status}）`)
  }
  return response
}

const collectDefinitionLanguages = (level: LevelFile): string[] => {
  const codes = new Set<string>()
  level.groups.forEach((group) => {
    group.tiles.forEach((tile) => {
      Object.keys(tile.translations ?? {}).forEach((code) => {
        if (code) {
          codes.add(code)
        }
      })
    })
  })
  return Array.from(codes)
}

const normalizeLevelLanguageProfile = (level: LevelFile): LevelFile => {
  const sampleTile = level.groups[0]?.tiles[0]
  const fallbackGame = sampleTile?.languageCode ?? DEFAULT_GAME_LANGUAGE
  const fallbackDefinitions = collectDefinitionLanguages(level)

  const profile = level.languageProfile ?? DEFAULT_LEVEL_LANGUAGE_PROFILE
  const gameDefault = profile.game?.default ?? fallbackGame
  const gameOptions =
    profile.game?.options?.length && profile.game.options.includes(gameDefault)
      ? profile.game.options
      : [gameDefault]

  const definitionOptions =
    profile.definitions?.options?.length && profile.definitions.options.length > 0
      ? profile.definitions.options
      : fallbackDefinitions.length
      ? fallbackDefinitions
      : DEFAULT_DEFINITION_LANGUAGES

  let definitionDefaults =
    profile.definitions?.defaults?.filter((code) => definitionOptions.includes(code)) ??
    fallbackDefinitions.slice(0, Math.max(1, Math.min(2, fallbackDefinitions.length)))
  if (!definitionDefaults.length) {
    definitionDefaults = definitionOptions.slice(0, 1)
  }
  if (!definitionDefaults.length) {
    definitionDefaults = [...DEFAULT_DEFINITION_LANGUAGES]
  }

  level.languageProfile = {
    game: {
      default: gameDefault,
      options: gameOptions,
    },
    definitions: {
      defaults: definitionDefaults.slice(0, MAX_DEFINITION_LANGUAGES),
      options: definitionOptions,
      min: profile.definitions?.min ?? MIN_DEFINITION_LANGUAGES,
      max: profile.definitions?.max ?? MAX_DEFINITION_LANGUAGES,
    },
  }

  return level
}

export const clearLevelCache = () => {
  levelCache.clear()
  cachedIndex = null
}

export const fetchLevelIndex = async (): Promise<LevelIndexEntry[]> => {
  if (cachedIndex) {
    return cachedIndex
  }
  const response = await ensureResponse(await fetch(INDEX_PATH, { cache: 'no-cache' }), INDEX_PATH)
  const payload = (await response.json()) as { levels: LevelIndexEntry[] }
  cachedIndex = payload.levels
  return cachedIndex
}

export const fetchLevelData = async (file: string): Promise<LevelFile> => {
  if (levelCache.has(file)) {
    return levelCache.get(file)!
  }
  const resourcePath = `/levels/${file}`
  const response = await ensureResponse(await fetch(resourcePath, { cache: 'no-cache' }), resourcePath)
  const payload = (await response.json()) as LevelFile
  const normalized = normalizeLevelLanguageProfile(payload)
  levelCache.set(file, normalized)
  return normalized
}
