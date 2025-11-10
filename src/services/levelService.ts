import type { LevelFile, LevelIndexEntry } from '../types/levels'

const INDEX_PATH = '/levels/index.json'

const levelCache = new Map<string, LevelFile>()
let cachedIndex: LevelIndexEntry[] | null = null

const ensureResponse = async (response: Response, resource: string) => {
  if (!response.ok) {
    throw new Error(`加载资源失败: ${resource}（${response.status}）`)
  }
  return response
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
  levelCache.set(file, payload)
  return payload
}

