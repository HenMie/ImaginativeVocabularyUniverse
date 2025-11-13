import type { LanguageConfig } from '../types/language'

const LANG_PATH = '/languages.json'
let cache: LanguageConfig[] | null = null
let pendingRequest: Promise<LanguageConfig[]> | null = null

export const fetchLanguages = async (): Promise<LanguageConfig[]> => {
  // 如果已有缓存,直接返回
  if (cache) {
    return cache
  }

  // 如果有正在进行的请求,等待该请求完成
  if (pendingRequest) {
    return pendingRequest
  }

  // 创建新的请求并缓存 Promise
  pendingRequest = (async () => {
    try {
      const response = await fetch(LANG_PATH, { cache: 'no-cache' })
      if (!response.ok) {
        throw new Error(`无法加载语言配置（${response.status}）`)
      }
      const payload = (await response.json()) as { languages: LanguageConfig[] }
      cache = payload.languages
      return cache
    } finally {
      // 请求完成后清除 pending 状态
      pendingRequest = null
    }
  })()

  return pendingRequest
}

