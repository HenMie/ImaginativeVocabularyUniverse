import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import {
  fetchUserProfile,
  upsertUserProfile,
  type UserProfileSummary,
} from '../services/profileService'
import {
  fetchRemoteProgress,
  type RemoteProgressSnapshot,
} from '../services/playerProgressService'
import { LoadingSpinner } from '../components/LoadingSpinner'

interface ProfileFormState {
  username: string
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

const formatNumber = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return value.toLocaleString('zh-CN')
}

export const UserProfile = () => {
  const { user } = useAuthContext()
  const userId = user?.id ?? null
  const defaultUsername = useMemo(() => {
    if (!user) return ''
    return (
      user.user_metadata?.full_name ??
      user.email?.split('@')[0] ??
      ''
    )
  }, [user])

  const [profile, setProfile] = useState<UserProfileSummary | null>(null)
  const [progress, setProgress] = useState<RemoteProgressSnapshot | null>(null)
  const [formState, setFormState] = useState<ProfileFormState>({
    username: '',
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!userId) {
      return
    }
    const [profileData, progressSnapshot] = await Promise.all([
      fetchUserProfile(userId),
      fetchRemoteProgress(userId),
    ])
    setProfile(profileData)
    setProgress(progressSnapshot)
    // 优先使用 Supabase Auth 的 full_name
    setFormState({
      username: defaultUsername || profileData?.username || '',
    })
  }, [defaultUsername, userId])

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    loadProfile()
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadProfile, userId])

  const handleRefresh = async () => {
    if (!userId) return
    setRefreshing(true)
    setError(null)
    try {
      await loadProfile()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleFieldChange = (field: keyof ProfileFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event?: FormEvent<HTMLFormElement> | React.MouseEvent) => {
    event?.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await upsertUserProfile(userId, {
        username: formState.username,
      })
      setProfile(updated)
      setSuccess('个人资料已更新并同步到云端')
      setIsEditing(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // 优先使用 Supabase Auth 的 full_name
    setFormState({
      username: defaultUsername || profile?.username || '',
    })
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  // 如果用户在数据库中设置了 username，优先显示它；否则使用 Supabase Auth 的 full_name
  const displayUsername = profile?.username ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '—'

  if (!userId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <p className="text-sm text-slate-500">尚未登录，无法加载个人资料。</p>
      </div>
    )
  }

  return (
    <div className="page-enter-animation mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 lg:max-w-5xl lg:gap-8 lg:px-6 lg:py-10 xl:max-w-6xl xl:gap-10 xl:px-8 xl:py-12 2xl:max-w-7xl">
      <header className="fade-in-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 lg:text-3xl xl:text-4xl">个人资料</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 lg:text-base">
            查看帐号详情、更新展示名称。
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-smooth hover:bg-slate-50 hover-scale-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:px-5 lg:py-2.5 lg:text-base"
        >
          {refreshing || loading ? '刷新中...' : '重新读取'}
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-4xl border border-dashed border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/60 backdrop-blur-sm">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <section className="card-enter rounded-4xl border border-slate-200 bg-white p-6 shadow-medium dark:border-slate-700 dark:bg-slate-900 lg:p-8 xl:p-10 backdrop-blur-sm transition-smooth">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">账户概览</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">登录邮箱</dt>
                <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user.email ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">用户名</dt>
                {isEditing ? (
                  <dd className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formState.username}
                      onChange={(event) => handleFieldChange('username', event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleSubmit(event as any)
                        } else if (event.key === 'Escape') {
                          handleCancelEdit()
                        }
                      }}
                      className="flex-1 rounded-lg border border-primary px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-dark-primary dark:bg-slate-800 dark:text-slate-100"
                      placeholder="输入希望展示的昵称"
                      autoFocus
                      disabled={saving}
                    />
                    <button
                      type="button"
                      onClick={handleSubmit as any}
                      disabled={saving}
                      className="inline-flex items-center justify-center rounded-full p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                      title="保存"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      title="取消"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </dd>
                ) : (
                  <dd className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                    <span>{displayUsername}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      title="编辑用户名"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                  </dd>
                )}
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">游戏进度</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <dt className="text-xs text-slate-500 dark:text-slate-400">金币</dt>
                <dd className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatNumber(progress?.coins)}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <dt className="text-xs text-slate-500 dark:text-slate-400">经验</dt>
                <dd className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {formatNumber(progress?.experience)}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                <dt className="text-xs text-slate-500 dark:text-slate-400">最近在线</dt>
                <dd className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {progress ? formatDateTime(progress.lastOnlineAt) : '—'}
                </dd>
              </div>
            </div>
            <div className="mt-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <p className="mt-2">
                  最后更新：{progress ? formatDateTime(progress.updatedAt) : '—'}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
