/**
 * 生词本服务层
 * 处理与 Supabase 的所有生词本相关交互
 */

import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import type { VocabularyEntry, AddVocabularyInput, UpdateVocabularyInput } from '../types/vocabulary'

type VocabularyRow = Database['public']['Tables']['vocabulary_book']['Row']

/**
 * 将数据库行映射为 VocabularyEntry
 */
const mapRowToEntry = (row: VocabularyRow): VocabularyEntry => ({
  id: row.id,
  userId: row.user_id,
  word: row.word,
  translation: row.translation,
  language: row.language,
  levelId: row.level_id,
  groupCategory: row.group_category,
  tileId: row.tile_id,
  addedAt: row.added_at,
  lastReviewedAt: row.last_reviewed_at,
  reviewCount: row.review_count,
  notes: row.notes,
  updatedAt: row.updated_at,
})

/**
 * 获取用户的所有生词
 */
export const fetchUserVocabulary = async (
  userId: string,
  language?: string,
): Promise<VocabularyEntry[]> => {
  let query = supabase
    .from('vocabulary_book')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })

  if (language) {
    query = query.eq('language', language)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`获取生词本失败: ${error.message}`)
  }

  return (data || []).map(mapRowToEntry)
}

/**
 * 添加生词
 */
export const addVocabulary = async (
  userId: string,
  input: AddVocabularyInput,
): Promise<VocabularyEntry> => {
  const { data, error } = await supabase
    .from('vocabulary_book')
    .insert({
      user_id: userId,
      word: input.word,
      translation: input.translation,
      language: input.language,
      level_id: input.levelId || null,
      group_category: input.groupCategory || null,
      tile_id: input.tileId || null,
      notes: input.notes || null,
    })
    .select()
    .single()

  if (error) {
    // 如果是重复添加,返回友好提示
    if (error.code === '23505') {
      throw new Error('该词汇已在生词本中')
    }
    throw new Error(`添加生词失败: ${error.message}`)
  }

  return mapRowToEntry(data)
}

/**
 * 删除生词
 */
export const removeVocabulary = async (id: string): Promise<void> => {
  const { error } = await supabase.from('vocabulary_book').delete().eq('id', id)

  if (error) {
    throw new Error(`删除生词失败: ${error.message}`)
  }
}

/**
 * 更新生词信息
 */
export const updateVocabulary = async (
  id: string,
  input: UpdateVocabularyInput,
): Promise<VocabularyEntry> => {
  const { data, error } = await supabase
    .from('vocabulary_book')
    .update({
      notes: input.notes,
      translation: input.translation,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`更新生词失败: ${error.message}`)
  }

  return mapRowToEntry(data)
}

/**
 * 更新复习记录
 */
export const updateReviewRecord = async (id: string): Promise<VocabularyEntry> => {
  // 先获取当前的复习次数
  const { data: currentData, error: fetchError } = await supabase
    .from('vocabulary_book')
    .select('review_count')
    .eq('id', id)
    .single()

  if (fetchError) {
    throw new Error(`获取复习记录失败: ${fetchError.message}`)
  }

  // 更新复习记录
  const { data, error } = await supabase
    .from('vocabulary_book')
    .update({
      last_reviewed_at: new Date().toISOString(),
      review_count: (currentData.review_count || 0) + 1,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`更新复习记录失败: ${error.message}`)
  }

  return mapRowToEntry(data)
}

/**
 * 批量添加生词
 */
export const batchAddVocabulary = async (
  userId: string,
  entries: AddVocabularyInput[],
): Promise<VocabularyEntry[]> => {
  const { data, error } = await supabase
    .from('vocabulary_book')
    .insert(
      entries.map((entry) => ({
        user_id: userId,
        word: entry.word,
        translation: entry.translation,
        language: entry.language,
        level_id: entry.levelId || null,
        group_category: entry.groupCategory || null,
        tile_id: entry.tileId || null,
        notes: entry.notes || null,
      })),
    )
    .select()

  if (error) {
    throw new Error(`批量添加生词失败: ${error.message}`)
  }

  return (data || []).map(mapRowToEntry)
}

