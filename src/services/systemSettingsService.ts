import { supabase } from '../lib/supabase'

export interface SystemSetting {
  id: string
  key: string
  value: boolean | string | number | object
  description: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

interface SystemSettingRow {
  id: string
  key: string
  value: unknown
  description: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

const mapRowToSetting = (row: SystemSettingRow): SystemSetting => ({
  id: row.id,
  key: row.key,
  value: row.value as boolean | string | number | object,
  description: row.description,
  updatedBy: row.updated_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

/**
 * 获取所有系统配置
 */
export const fetchSystemSettings = async (): Promise<SystemSetting[]> => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('key')

  if (error) {
    throw new Error(`获取系统配置失败：${error.message}`)
  }

  return (data || []).map(mapRowToSetting)
}

/**
 * 获取单个系统配置
 */
export const fetchSystemSetting = async (key: string): Promise<SystemSetting | null> => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    throw new Error(`获取系统配置失败：${error.message}`)
  }

  return data ? mapRowToSetting(data as SystemSettingRow) : null
}

/**
 * 获取系统配置的值（简化版本）
 */
export const getSystemSettingValue = async <T = boolean>(
  key: string,
  defaultValue: T,
): Promise<T> => {
  try {
    const setting = await fetchSystemSetting(key)
    return setting ? (setting.value as T) : defaultValue
  } catch (error) {
    console.error(`获取系统配置 ${key} 失败:`, error)
    return defaultValue
  }
}

/**
 * 更新系统配置
 */
export const updateSystemSetting = async (
  key: string,
  value: boolean | string | number | object,
): Promise<SystemSetting> => {
  // 获取当前用户 ID
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('system_settings')
    .update({
      value,
      updated_by: user?.id,
    })
    .eq('key', key)
    .select('*')
    .single()

  if (error) {
    throw new Error(`更新系统配置失败：${error.message}`)
  }

  if (!data) {
    throw new Error('更新系统配置失败：未返回任何数据')
  }

  return mapRowToSetting(data as SystemSettingRow)
}

/**
 * 批量更新系统配置
 */
export const updateSystemSettings = async (
  settings: Array<{ key: string; value: boolean | string | number | object }>,
): Promise<void> => {
  // 获取当前用户 ID
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 逐个更新配置
  for (const setting of settings) {
    const { error } = await supabase
      .from('system_settings')
      .update({
        value: setting.value,
        updated_by: user?.id,
      })
      .eq('key', setting.key)

    if (error) {
      throw new Error(`更新系统配置 ${setting.key} 失败：${error.message}`)
    }
  }
}

/**
 * 检查是否开放注册
 */
export const isRegistrationEnabled = async (): Promise<boolean> => {
  return getSystemSettingValue('registration_enabled', true)
}

/**
 * 检查是否需要邮箱验证
 */
export const isEmailVerificationRequired = async (): Promise<boolean> => {
  return getSystemSettingValue('email_verification_required', true)
}

