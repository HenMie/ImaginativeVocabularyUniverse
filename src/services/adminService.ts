import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type AdminUserRow = Database['public']['Tables']['admin_users']['Row']
type AdminUserSelect = AdminUserRow & {
  profiles?:
    | {
        username: string | null
      }
    | {
        username: string | null
      }[]
    | null
}

export interface AdminUserEntry {
  id: string
  userId: string
  username: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export const fetchAdminUsers = async (): Promise<AdminUserEntry[]> => {
  const { data, error } = await supabase
    .from('admin_users')
    .select(
      `
      id,
      user_id,
      notes,
      created_at,
      updated_at,
      profiles:user_id (
        username
      )
    `,
    )
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`无法获取管理员列表：${error.message}`)
  }

  const rows = (data ?? []) as AdminUserSelect[]

  const resolveUsername = (entry: AdminUserSelect['profiles']) => {
    if (!entry) return null
    if (Array.isArray(entry)) {
      return entry[0]?.username ?? null
    }
    return entry.username ?? null
  }

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    username: resolveUsername(row.profiles),
  }))
}

export const addAdminUser = async (userId: string, notes?: string) => {
  const { error } = await supabase.from('admin_users').insert({
    user_id: userId,
    notes,
  })

  if (error) {
    throw new Error(`添加管理员失败：${error.message}`)
  }
}

export const updateAdminNotes = async (adminId: string, notes: string | null) => {
  const { error } = await supabase
    .from('admin_users')
    .update({ notes })
    .eq('id', adminId)

  if (error) {
    throw new Error(`更新管理员备注失败：${error.message}`)
  }
}

export const removeAdminUser = async (adminId: string) => {
  const { error } = await supabase.from('admin_users').delete().eq('id', adminId)

  if (error) {
    throw new Error(`移除管理员失败：${error.message}`)
  }
}
