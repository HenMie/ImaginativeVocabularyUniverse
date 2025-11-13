import { supabase } from '../lib/supabase'
import type { PlayerProgress } from '../types/progress'
import { requestManager } from '../utils/requestManager'

export interface RemoteProgressSnapshot {
  coins: number
  experience: number
  payload: Partial<PlayerProgress> | null
  lastOnlineAt: string
  updatedAt: string
}

export const fetchRemoteProgress = async (
  userId: string,
): Promise<RemoteProgressSnapshot | null> => {
  const cacheKey = `user-progress-${userId}`

  return requestManager.execute(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('coins, experience, settings, last_online_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        throw new Error(`无法加载玩家进度：${error.message}`)
      }

      if (!data) {
        return null
      }

      return {
        coins: data.coins,
        experience: data.experience,
        payload: (data.settings as Partial<PlayerProgress> | null) ?? null,
        lastOnlineAt: data.last_online_at,
        updatedAt: data.updated_at,
      }
    },
    {
      retries: 3,
      timeout: 30000,
    }
  )
}

export const persistRemoteProgress = async (
  userId: string,
  progress: PlayerProgress,
) => {
  const { error } = await supabase.from('user_progress').upsert({
    user_id: userId,
    coins: progress.coins,
    experience: progress.experience ?? 0,
    settings: progress,
    last_online_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`\u4fdd\u5b58\u73a9\u5bb6\u8fdb\u5ea6\u5931\u8d25\uff1a${error.message}`)
  }
}

export interface UserLevelProgressRecord {
  levelId: string
  status: 'locked' | 'in_progress' | 'completed'
  attempts: number
  bestTimeMs: number | null
  bestScore: number | null
  lastPlayedAt: string | null
  updatedAt: string
}

export const fetchUserLevelProgressRecords = async (
  userId: string,
): Promise<UserLevelProgressRecord[]> => {
  const { data, error } = await supabase
    .from('user_level_progress')
    .select('level_id, status, attempts, best_time_ms, best_score, last_played_at, updated_at')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`\u65e0\u6cd5\u52a0\u8f7d\u5173\u5361\u8fdb\u5ea6\uff1a${error.message}`)
  }

  return (data ?? []).map((row) => ({
    levelId: row.level_id,
    status: row.status,
    attempts: row.attempts,
    bestTimeMs: row.best_time_ms,
    bestScore: row.best_score,
    lastPlayedAt: row.last_played_at,
    updatedAt: row.updated_at,
  }))
}

export interface UpsertUserLevelProgressInput {
  status?: 'locked' | 'in_progress' | 'completed'
  attempts?: number
  bestTimeMs?: number | null
  bestScore?: number | null
  lastPlayedAt?: string | null
}

export const upsertUserLevelProgressRecord = async (
  userId: string,
  levelId: string,
  input: UpsertUserLevelProgressInput,
) => {
  const { error } = await supabase
    .from('user_level_progress')
    .upsert(
      {
        user_id: userId,
        level_id: levelId,
        status: input.status,
        attempts: input.attempts,
        best_time_ms: input.bestTimeMs,
        best_score: input.bestScore,
        last_played_at: input.lastPlayedAt,
      },
      { onConflict: 'user_id,level_id' },
    )

  if (error) {
    throw new Error(`\u66f4\u65b0\u5173\u5361\u8fdb\u5ea6\u5931\u8d25\uff1a${error.message}`)
  }
}

export interface LeaderboardEntry {
  id: string
  userId: string
  levelId: string
  completionTimeMs: number
  coinsEarned: number
  hintsSpent: number
  submittedAt: string
  username: string | null
}

export const fetchLeaderboardEntries = async (
  levelId: string,
  limit = 10,
): Promise<LeaderboardEntry[]> => {
  const { data, error } = await supabase
    .from('leaderboards')
    .select('id, user_id, level_id, completion_time_ms, coins_earned, hints_spent, submitted_at')
    .eq('level_id', levelId)
    .order('completion_time_ms', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`\u83b7\u53d6\u6392\u884c\u699c\u5931\u8d25\uff1a${error.message}`)
  }

  const entries = data ?? []
  const userIds = Array.from(new Set(entries.map((entry) => entry.user_id)))

  let profileMap = new Map<string, { username: string | null }>()
  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)

    if (profileError) {
      throw new Error(`\u83b7\u53d6\u6392\u884c\u699c\u73a9\u5bb6\u4fe1\u606f\u5931\u8d25\uff1a${profileError.message}`)
    }

    profileMap = new Map(
      (profileData ?? []).map((profile) => [
        profile.id,
        { username: profile.username },
      ]),
    )
  }

  return entries.map((row) => {
    const profile = profileMap.get(row.user_id)
    return {
      id: row.id,
      userId: row.user_id,
      levelId: row.level_id,
      completionTimeMs: row.completion_time_ms,
      coinsEarned: row.coins_earned,
      hintsSpent: row.hints_spent,
      submittedAt: row.submitted_at,
      username: profile?.username ?? null,
    }
  })
}

export interface SubmitLeaderboardInput {
  userId: string
  levelId: string
  completionTimeMs: number
  coinsEarned: number
  hintsSpent: number
}

export const upsertLeaderboardEntry = async (input: SubmitLeaderboardInput) => {
  const { error } = await supabase
    .from('leaderboards')
    .upsert(
      {
        user_id: input.userId,
        level_id: input.levelId,
        completion_time_ms: input.completionTimeMs,
        coins_earned: input.coinsEarned,
        hints_spent: input.hintsSpent,
      },
      { onConflict: 'user_id,level_id' },
    )

  if (error) {
    throw new Error(`\u66f4\u65b0\u6392\u884c\u699c\u5931\u8d25\uff1a${error.message}`)
  }
}
