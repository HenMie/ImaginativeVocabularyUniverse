import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type UserProgressRow = Database['public']['Tables']['user_progress']['Row']
type UserProgressSummary = Pick<
  UserProgressRow,
  'user_id' | 'coins' | 'experience' | 'last_online_at' | 'updated_at'
>

export interface UserDirectoryEntry {
  userId: string
  username: string | null
  createdAt: string
  updatedAt: string
  coins: number | null
  experience: number | null
  lastOnlineAt: string | null
  progressUpdatedAt: string | null
}

export interface FetchUserDirectoryOptions {
  search?: string
  limit?: number
}

const isUserId = (value: string) => /^[0-9a-f-]{16,}$/i.test(value)

const USER_LIMIT = 50

export const fetchUserDirectory = async (
  options?: FetchUserDirectoryOptions,
): Promise<UserDirectoryEntry[]> => {
  const limit = options?.limit ?? USER_LIMIT
  const searchValue = options?.search?.trim()

  let query = supabase
    .from('profiles')
    .select('id, username, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (searchValue) {
    query = isUserId(searchValue)
      ? query.eq('id', searchValue)
      : query.ilike('username', `%${searchValue}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`无法载入用户资料：${error.message}`)
  }

  const profiles = (data ?? []) as ProfileRow[]
  const ids = profiles.map((profile) => profile.id)

  let progressByUser = new Map<string, UserProgressSummary>()
  if (ids.length > 0) {
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('user_id, coins, experience, last_online_at, updated_at')
      .in('user_id', ids)

    if (progressError) {
      throw new Error(`无法载入用户进度：${progressError.message}`)
    }

    const summaries = (progressData ?? []) as UserProgressSummary[]
    progressByUser = new Map(summaries.map((record) => [record.user_id, record]))
  }

  return profiles.map((profile) => {
    const progress = progressByUser.get(profile.id)
    return {
      userId: profile.id,
      username: profile.username,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      coins: progress?.coins ?? null,
      experience: progress?.experience ?? null,
      lastOnlineAt: progress?.last_online_at ?? null,
      progressUpdatedAt: progress?.updated_at ?? null,
    }
  })
}
