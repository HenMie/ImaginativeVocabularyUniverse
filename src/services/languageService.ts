import type { LanguageConfig } from '../types/language'

const LANG_PATH = '/languages.json'
let cache: LanguageConfig[] | null = null

export const fetchLanguages = async (): Promise<LanguageConfig[]> => {
  if (cache) {
    return cache
  }
  const response = await fetch(LANG_PATH, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`无法加载语言配置（${response.status}）`)
  }
  const payload = (await response.json()) as { languages: LanguageConfig[] }
  cache = payload.languages
  return cache
}

