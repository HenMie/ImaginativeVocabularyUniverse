import type { Database } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { requestManager } from '../utils/requestManager'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export interface UserProfileSummary {
  userId: string
  username: string | null
  createdAt: string
  updatedAt: string
}

const normalizeUsername = (value?: string | null) => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const mapRow = (row: ProfileRow): UserProfileSummary => ({
  userId: row.id,
  username: row.username,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const fetchUserProfile = async (
  userId: string,
): Promise<UserProfileSummary | null> => {
  const cacheKey = `user-profile-${userId}`

  return requestManager.execute(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        throw new Error(`无法加载个人资料：${error.message}`)
      }

      if (!data) {
        return null
      }

      return mapRow(data as ProfileRow)
    },
    {
      retries: 3,
      timeout: 30000,
    }
  )
}

export interface UpsertUserProfileInput {
  username?: string | null
}

export const upsertUserProfile = async (
  userId: string,
  input: UpsertUserProfileInput,
): Promise<UserProfileSummary> => {
  const payload: ProfileInsert = {
    id: userId,
    username: normalizeUsername(
      typeof input.username === 'undefined' ? undefined : input.username,
    ),
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, username, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(`更新个人资料失败：${error.message}`)
  }

  return mapRow(data as ProfileRow)
}
