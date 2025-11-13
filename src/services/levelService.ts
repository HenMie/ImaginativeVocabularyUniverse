import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import type { LevelRecord, LevelIndexEntry, LevelContent, Difficulty } from '../types/levels'
import { formatLevelTitle } from '../constants/levels'
import { requestManager } from '../utils/requestManager'

const levelCache = new Map<string, LevelRecord>()
let cachedIndex: LevelIndexEntry[] | null = null

const mapRowToLevel = (row: Database['public']['Tables']['levels']['Row']): LevelRecord => {
  const content = (row.content ?? {}) as unknown as LevelContent
  if (!content.groups || !Array.isArray(content.groups)) {
    throw new Error(`关卡 ${row.id} 缺少有效的分组数据`)
  }

  return {
    id: row.id,
    difficulty: row.difficulty,
    language: Array.isArray(row.language) ? row.language : [],
    version: row.version,
    isPublished: row.is_published,
    content,
    tutorialSteps: content.tutorialSteps,
    board: content.board,
    groups: content.groups,
    updatedAt: row.updated_at,
  }
}

const mapRowToIndexEntry = (
  row: Database['public']['Tables']['levels']['Row'],
): LevelIndexEntry => {
  const record = mapRowToLevel(row)
  return {
    id: record.id,
    title: formatLevelTitle(record.id),
    difficulty: record.difficulty,
    language: record.language,
    version: record.version,
    isPublished: record.isPublished,
    updatedAt: record.updatedAt,
  }
}

export const clearLevelCache = () => {
  levelCache.clear()
  cachedIndex = null
  // 取消所有正在进行的关卡相关请求
  requestManager.cancel('level-index-published')
  requestManager.cancel('level-index-all')
}

const invalidateLevelCaches = (levelId?: string) => {
  if (levelId) {
    levelCache.delete(levelId)
  }
  cachedIndex = null
}

interface FetchIndexOptions {
  includeDrafts?: boolean
}

export const fetchLevelIndex = async (
  options: FetchIndexOptions = {},
): Promise<LevelIndexEntry[]> => {
  // 如果有缓存且不需要草稿，直接返回
  if (!options.includeDrafts && cachedIndex) {
    return cachedIndex
  }

  const cacheKey = `level-index-${options.includeDrafts ? 'all' : 'published'}`

  return requestManager.execute(
    cacheKey,
    async () => {
      const query = supabase
        .from('levels')
        .select('*')
        .order('id', { ascending: true })

      if (!options.includeDrafts) {
        query.eq('is_published', true)
      }

      const { data, error } = await query
      if (error) {
        throw new Error(`无法加载在线关卡：${error.message}`)
      }

      const index = (data ?? []).map(mapRowToIndexEntry)

      if (!options.includeDrafts) {
        cachedIndex = index
      }

      return index
    },
    {
      retries: 3,
      timeout: 30000,
    }
  )
}

export const fetchLevelData = async (levelId: string): Promise<LevelRecord> => {
  // 检查缓存
  if (levelCache.has(levelId)) {
    return levelCache.get(levelId)!
  }

  const cacheKey = `level-data-${levelId}`

  return requestManager.execute(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .eq('id', levelId)
        .maybeSingle()

      if (error) {
        throw new Error(`无法获取关卡 ${levelId}：${error.message}`)
      }

      if (!data) {
        throw new Error(`未找到关卡 ${levelId}`)
      }

      const level = mapRowToLevel(data)
      levelCache.set(levelId, level)
      return level
    },
    {
      retries: 3,
      timeout: 30000,
    }
  )
}

export interface UpsertLevelPayload {
  id: string
  difficulty: Difficulty
  language: string[]
  version: number
  isPublished: boolean
  content: LevelContent
}

export const upsertLevelRecord = async (payload: UpsertLevelPayload): Promise<LevelRecord> => {
  // 获取当前用户 ID
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('levels')
    .upsert(
      {
        id: payload.id,
        difficulty: payload.difficulty,
        language: payload.language,
        version: payload.version,
        is_published: payload.isPublished,
        content: payload.content,
        updated_by: user?.id,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single()

  if (error) {
    throw new Error(`保存关卡失败：${error.message}`)
  }

  if (!data) {
    throw new Error('保存关卡失败：未返回任何数据')
  }

  invalidateLevelCaches(payload.id)
  const level = mapRowToLevel(data)
  levelCache.set(payload.id, level)
  return level
}

export const deleteLevelRecord = async (levelId: string) => {
  const { error } = await supabase.from('levels').delete().eq('id', levelId)
  if (error) {
    throw new Error(`删除关卡失败：${error.message}`)
  }

  invalidateLevelCaches(levelId)
}

/**
 * 检查当前用户是否是管理员
 */
export const checkIsAdmin = async (): Promise<boolean> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('检查管理员权限失败:', error)
    return false
  }

  return !!data
}
