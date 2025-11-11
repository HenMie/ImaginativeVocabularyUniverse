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

// 新的数据结构不需要复杂的多语言配置处理，直接返回即可
const validateLevelData = (level: LevelFile): LevelFile => {
  // 验证必要字段
  if (!level.id || !level.language || !Array.isArray(level.language)) {
    throw new Error(`关卡数据格式错误: ${level.id}`)
  }

  // 验证分组数据
  if (!level.groups || !Array.isArray(level.groups)) {
    throw new Error(`关卡分组数据错误: ${level.id}`)
  }

  // 验证每个分组的词牌数据
  level.groups.forEach((group) => {
    if (!group.tiles || !Array.isArray(group.tiles)) {
      throw new Error(`分组词牌数据错误: ${group.id}`)
    }

    group.tiles.forEach((tile) => {
      if (!tile.text || typeof tile.text !== 'object') {
        throw new Error(`词牌文本数据错误: ${tile.id}`)
      }
    })
  })

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
  const validated = validateLevelData(payload)
  levelCache.set(file, validated)
  return validated
}
