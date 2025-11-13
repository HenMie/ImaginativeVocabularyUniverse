import { useState, useEffect, useMemo } from 'react'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getSupabaseAdminClient } from '../lib/supabaseAdmin'
// import { CloudStorageService } from '../services/cloudStorageService'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { UserDetailModal } from '../components/UserDetailModal'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalGamesPlayed: number
  averageCompletionTime: number
}

type UserStatus = 'active' | 'pending' | 'invited' | 'banned'

type SupabaseAdminUser = SupabaseAuthUser & {
  banned_until?: string | null
  invited_at?: string | null
  last_sign_in_at?: string | null
  confirmed_at?: string | null
  raw_app_meta_data?: Record<string, any>
  raw_user_meta_data?: Record<string, any>
  providers?: string[]
  is_sso_user?: boolean
  is_anonymous?: boolean
  phone?: string | null
}

interface ManagedUser {
  id: string
  email: string | null
  fullName: string
  username: string
  createdAt: string
  lastSignInAt: string | null
  confirmedAt: string | null
  invitedAt: string | null
  bannedUntil: string | null
  providers: string[]
  isSsoUser: boolean
  isAnonymous: boolean
  phone: string | null
  coins: number
  levelCount: number
  lastProgressUpdate: string | null
  status: UserStatus
  isAdmin: boolean
  isVerified: boolean
  raw: SupabaseAdminUser
}

interface ProfileRecord {
  id: string
  full_name: string | null
  username: string | null
  is_admin: boolean | null
}

interface ProgressRecord {
  id: string
  coins: number | null
  unlocked_level_ids: string[] | null
  updated_at: string | null
}

const deriveUserStatus = (user: SupabaseAdminUser): UserStatus => {
  if (user.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
    return 'banned'
  }

  if (user.invited_at && !user.confirmed_at) {
    return 'invited'
  }

  if (!user.confirmed_at) {
    return 'pending'
  }

  return 'active'
}

const STATUS_META: Record<UserStatus, { label: string; className: string }> = {
  active: {
    label: '活跃',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
  },
  pending: {
    label: '待验证',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
  },
  invited: {
    label: '已邀请',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
  },
  banned: {
    label: '已禁用',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
  }
}

const PROVIDER_CLASS_MAP: Record<string, string> = {
  email: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  google: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  github: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
  apple: 'bg-black text-white dark:bg-white dark:text-black',
  phone: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  azure: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
}

const getProviderBadgeClass = (provider: string) => {
  const key = provider.toLowerCase()
  return PROVIDER_CLASS_MAP[key] || 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100'
}

export function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'leaderboards'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 20 })
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'last_sign_in_at' | 'coins' | 'level_count'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [usersInitialized, setUsersInitialized] = useState(false)
  const [userFetchError, setUserFetchError] = useState<string | null>(null)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'users' && !usersInitialized) {
      setUsersInitialized(true)
      fetchUsers()
    }
  }, [activeTab, usersInitialized])

  useEffect(() => {
    setUserPagination(prev => ({ ...prev, page: 1 }))
  }, [searchTerm, roleFilter, statusFilter, verificationFilter])

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    let list = [...users]

    if (keyword) {
      list = list.filter(user => {
        const candidates = [
          user.email || '',
          user.fullName || '',
          user.username || '',
          user.id
        ].map(value => value.toLowerCase())

        return candidates.some(value => value.includes(keyword))
      })
    }

    if (roleFilter !== 'all') {
      list = list.filter(user => (roleFilter === 'admin' ? user.isAdmin : !user.isAdmin))
    }

    if (statusFilter !== 'all') {
      list = list.filter(user => user.status === statusFilter)
    }

    if (verificationFilter !== 'all') {
      list = list.filter(user => (verificationFilter === 'verified' ? user.isVerified : !user.isVerified))
    }

    const getComparableValue = (user: ManagedUser) => {
      switch (sortBy) {
        case 'coins':
          return user.coins
        case 'level_count':
          return user.levelCount
        case 'last_sign_in_at':
          return user.lastSignInAt ? new Date(user.lastSignInAt).getTime() : 0
        case 'created_at':
        default:
          return new Date(user.createdAt).getTime()
      }
    }

    return list.sort((a, b) => {
      const aValue = getComparableValue(a)
      const bValue = getComparableValue(b)
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })
  }, [users, searchTerm, roleFilter, statusFilter, verificationFilter, sortBy, sortOrder])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil((filteredUsers.length || 1) / userPagination.limit))
    if (userPagination.page > maxPage) {
      setUserPagination(prev => ({ ...prev, page: maxPage }))
    }
  }, [filteredUsers.length, userPagination.limit, userPagination.page])

  const totalFilteredUsers = filteredUsers.length
  const startIndex = (userPagination.page - 1) * userPagination.limit
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + userPagination.limit)
  const showingFrom = totalFilteredUsers === 0 ? 0 : startIndex + 1
  const showingTo = Math.min(startIndex + userPagination.limit, totalFilteredUsers)

  const fetchStats = async () => {
    try {
      // 获取用户统计
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // 获取最近7天活跃用户
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count: activeUsers } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', sevenDaysAgo)

      // 获取游戏统计
      const { data: gamesData } = await supabase
        .from('leaderboards')
        .select('completion_time_ms')

      // 获取平均完成时间
      const avgCompletionTime = gamesData && gamesData.length > 0
        ? gamesData.reduce((sum, game) => sum + game.completion_time_ms, 0) / gamesData.length
        : 0

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalGamesPlayed: gamesData?.length || 0,
        averageCompletionTime: Math.round(avgCompletionTime / 1000) // 转换为秒
      })
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }

  const fetchUsers = async () => {
    const adminClient = getSupabaseAdminClient()

    if (!adminClient) {
      setUserFetchError('请在 .env.local 中配置 VITE_SUPABASE_SERVICE_ROLE_KEY 以读取 Supabase Auth 用户数据。')
      return
    }

    try {
      setUsersLoading(true)
      setUserFetchError(null)
      setExpandedUserId(null)

      const perPage = 200
      let page = 1
      const authUsers: SupabaseAdminUser[] = []

      while (true) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
        if (error) throw error
        const pageUsers = (data?.users ?? []) as SupabaseAdminUser[]
        authUsers.push(...pageUsers)
        if (pageUsers.length < perPage) {
          break
        }
        page += 1
      }

      const userIds = authUsers.map(user => user.id)

      const profilesPromise = userIds.length
        ? supabase
            .from('profiles')
            .select('id, full_name, username, is_admin')
            .in('id', userIds)
        : Promise.resolve({ data: [], error: null })

      const progressPromise = userIds.length
        ? supabase
            .from('user_progress')
            .select('id, coins, unlocked_level_ids, updated_at')
            .in('id', userIds)
        : Promise.resolve({ data: [], error: null })

      const adminPromise = userIds.length
        ? supabase
            .from('admin_users')
            .select('user_id, role')
            .in('user_id', userIds)
        : Promise.resolve({ data: [], error: null })

      const [profilesResult, progressResult, adminResult] = await Promise.all([
        profilesPromise,
        progressPromise,
        adminPromise
      ])

      if (profilesResult.error) throw profilesResult.error
      if (progressResult.error) throw progressResult.error
      if (adminResult.error) throw adminResult.error

      const profileMap = new Map<string, ProfileRecord>()
      profilesResult.data?.forEach(profile => {
        profileMap.set(profile.id, profile)
      })

      const progressMap = new Map<string, ProgressRecord>()
      progressResult.data?.forEach(progress => {
        progressMap.set(progress.id, progress)
      })

      const adminSet = new Set<string>()
      adminResult.data?.forEach(admin => {
        if (admin.role === 'admin' || admin.role === 'super_admin') {
          adminSet.add(admin.user_id)
        }
      })

      const mappedUsers: ManagedUser[] = authUsers.map(user => {
        const profile = profileMap.get(user.id)
        const progress = progressMap.get(user.id)
        const appMetadata = (user.raw_app_meta_data ?? user.app_metadata ?? {}) as Record<string, any>

        const providers = Array.from(
          new Set(
            [
              ...(user.providers || []),
              ...(Array.isArray(appMetadata.providers) ? appMetadata.providers : [])
            ].filter(Boolean)
          )
        ) as string[]

        if (providers.length === 0 && appMetadata.provider) {
          providers.push(appMetadata.provider)
        }

        const metadata = (user.raw_user_meta_data ?? user.user_metadata ?? {}) as Record<string, any>
        const fullName = profile?.full_name || metadata.full_name || ''
        const username = profile?.username || metadata.username || ''

        const isVerified = Boolean(user.confirmed_at || metadata.email_verified)

        return {
          id: user.id,
          email: user.email || null,
          fullName,
          username,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at || null,
          confirmedAt: user.confirmed_at || null,
          invitedAt: user.invited_at || null,
          bannedUntil: user.banned_until || null,
          providers: providers.length > 0 ? providers : ['email'],
          isSsoUser: Boolean(user.is_sso_user),
          isAnonymous: Boolean(user.is_anonymous),
          phone: user.phone ?? null,
          coins: progress?.coins ?? 0,
          levelCount: progress?.unlocked_level_ids?.length ?? 0,
          lastProgressUpdate: progress?.updated_at || null,
          status: deriveUserStatus(user),
          isAdmin: adminSet.has(user.id),
          isVerified,
          raw: user
        }
      })

      setUsers(mappedUsers)
    } catch (error) {
      console.error('获取用户列表失败:', error)
      setUserFetchError(error instanceof Error ? error.message : '未知错误')
    } finally {
      setUsersLoading(false)
    }
  }

  const grantAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .upsert({
          user_id: userId,
          role: 'admin',
          permissions: ['user_management', 'content_management'],
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      alert('管理员权限已授予')
      fetchUsers()
    } catch (error) {
      console.error('授予权限失败:', error)
      alert('操作失败')
    }
  }

  const revokeAdminRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', userId)

      if (error) throw error
      alert('管理员权限已撤销')
      fetchUsers()
    } catch (error) {
      console.error('撤销权限失败:', error)
      alert('操作失败')
    }
  }

  const resetUserProgress = async (userId: string) => {
    if (!confirm('确定要重置该用户的进度吗？此操作不可撤销！')) return

    try {
      // Delete level snapshots
      await supabase
        .from('level_snapshots')
        .delete()
        .eq('user_id', userId)

      // Delete leaderboard entries
      await supabase
        .from('leaderboards')
        .delete()
        .eq('user_id', userId)

      // Reset user progress
      await supabase
        .from('user_progress')
        .update({
          coins: 0,
          unlocked_level_ids: [],
          seen_tutorials: [],
          settings: {},
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      alert('用户进度已重置')
      fetchUsers()
    } catch (error) {
      console.error('重置进度失败:', error)
      alert('操作失败')
    }
  }

  const exportUsers = () => {
    if (!users.length) {
      alert('当前没有可导出的用户数据')
      return
    }

    try {
      const header = [
        'ID',
        '邮箱',
        '姓名',
        '用户名',
        '状态',
        '管理员',
        '注册时间',
        '最后登录',
        '金币',
        '解锁关卡数',
        '验证状态',
        '登录方式'
      ]

      const rows = users.map(user => [
        user.id,
        user.email || '',
        user.fullName || '',
        user.username || '',
        user.status,
        user.isAdmin ? 'YES' : 'NO',
        format_date(user.createdAt),
        user.lastSignInAt ? format_date(user.lastSignInAt) : '',
        user.coins,
        user.levelCount,
        user.isVerified ? 'VERIFIED' : 'UNVERIFIED',
        user.providers.join('|')
      ])

      const csvContent = [header, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('导出用户数据失败:', error)
      alert('导出失败')
    }
  }

  const format_date = (dateString?: string | null) => {
    if (!dateString) {
      return '—'
    }
    return new Date(dateString).toLocaleString('zh-CN')
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                管理员面板
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                管理用户、查看统计数据和系统配置
              </p>
            </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总用户数</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">活跃用户</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsers}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">最近7天</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">总游戏次数</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalGamesPlayed}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">平均完成时间</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageCompletionTime}s</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  总览
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  用户管理
                </button>
                <button
                  onClick={() => setActiveTab('leaderboards')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'leaderboards'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  排行榜
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">系统概览</h3>
                  <div className="text-gray-600 dark:text-gray-400">
                    <p>这里是系统的总览信息，包括关键指标和趋势。</p>
                    <p className="mt-2">更多功能正在开发中...</p>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">用户管理</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        直接读取 Supabase Auth 的 Raw JSON，快速核对登录、验证与禁用状态。
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={fetchUsers}
                        className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                      >
                        刷新数据
                      </button>
                      <button
                        onClick={exportUsers}
                        disabled={!users.length}
                        className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        导出数据
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
                    <div className="lg:col-span-2">
                      <input
                        type="text"
                        placeholder="邮箱 / 姓名 / ID 模糊搜索"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                      >
                        <option value="all">全部角色</option>
                        <option value="admin">仅管理员</option>
                        <option value="user">仅普通用户</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                      >
                        <option value="all">全部状态</option>
                        <option value="active">活跃</option>
                        <option value="pending">待验证</option>
                        <option value="invited">已邀请</option>
                        <option value="banned">被禁用</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={verificationFilter}
                        onChange={(e) => setVerificationFilter(e.target.value as 'all' | 'verified' | 'unverified')}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                      >
                        <option value="all">邮箱验证状态</option>
                        <option value="verified">仅已验证</option>
                        <option value="unverified">仅未验证</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'created_at' | 'last_sign_in_at' | 'coins' | 'level_count')}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                      >
                        <option value="created_at">按注册时间</option>
                        <option value="last_sign_in_at">按最近登录</option>
                        <option value="coins">按金币</option>
                        <option value="level_count">按关卡数</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-500"
                      >
                        <option value="desc">降序</option>
                        <option value="asc">升序</option>
                      </select>
                    </div>
                  </div>

                  {userFetchError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
                      <p className="font-medium">无法加载 Supabase Auth 用户数据</p>
                      <p className="mt-1">
                        {userFetchError}。请确认在 <code className="rounded bg-red-100 px-1 py-0.5 text-xs text-red-800">.env.local</code>{' '}
                        中配置了 <code className="rounded bg-red-100 px-1 py-0.5 text-xs text-red-800">VITE_SUPABASE_SERVICE_ROLE_KEY</code> 并重新刷新。
                      </p>
                    </div>
                  )}

                  {usersLoading ? (
                    <div className="flex justify-center py-12">
                      <LoadingSpinner size="lg" />
                    </div>
                  ) : (
                    <>
                      {paginatedUsers.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                          {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' || verificationFilter !== 'all'
                            ? '没有符合当前筛选条件的用户。'
                            : '还没有可展示的用户记录。'}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {paginatedUsers.map(user => {
                            const statusMeta = STATUS_META[user.status]
                            const isJsonExpanded = expandedUserId === user.id
                            return (
                              <div key={user.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                                        {statusMeta.label}
                                      </span>
                                      <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                          user.isVerified
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                                        }`}
                                      >
                                        {user.isVerified ? '邮箱已验证' : '邮箱未验证'}
                                      </span>
                                      {user.isAdmin && (
                                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                                          管理员
                                        </span>
                                      )}
                                      {user.bannedUntil && (
                                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-100">
                                          禁用至 {format_date(user.bannedUntil)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                                      {user.email || '未设置邮箱'}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {user.fullName || '未填写姓名'}
                                    </p>
                                    {user.username && (
                                      <p className="text-xs text-gray-400 dark:text-gray-500">@{user.username}</p>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {user.providers.map(provider => (
                                      <span
                                        key={`${user.id}-${provider}`}
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getProviderBadgeClass(provider)}`}
                                      >
                                        {provider.toUpperCase()}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-4 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-4">
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">注册时间</p>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{format_date(user.createdAt)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">最近登录</p>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{format_date(user.lastSignInAt)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">金币</p>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{user.coins}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">解锁关卡</p>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{user.levelCount}</p>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-3">
                                  <button
                                    onClick={() => setSelectedUser(user.id)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    查看详情
                                  </button>
                                  <button
                                    onClick={() => setExpandedUserId(isJsonExpanded ? null : user.id)}
                                    className="text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                                  >
                                    {isJsonExpanded ? '收起 Raw JSON' : '查看 Raw JSON'}
                                  </button>
                                  {user.isAdmin ? (
                                    <button
                                      onClick={() => revokeAdminRole(user.id)}
                                      className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      撤销管理员
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => grantAdminRole(user.id)}
                                      className="text-sm font-medium text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                    >
                                      设为管理员
                                    </button>
                                  )}
                                  <button
                                    onClick={() => resetUserProgress(user.id)}
                                    className="text-sm font-medium text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                                  >
                                    重置进度
                                  </button>
                                </div>

                                {isJsonExpanded && (
                                  <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                      Raw JSON
                                    </p>
                                    <pre className="mt-2 max-h-80 overflow-x-auto whitespace-pre-wrap break-words text-xs text-gray-800 dark:text-gray-100">
                                      {JSON.stringify(user.raw, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="mt-6 flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-300 md:flex-row md:items-center md:justify-between">
                        <div>
                          显示 {showingFrom} - {showingTo} / {totalFilteredUsers || 0} 名用户
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setUserPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={userPagination.page === 1}
                            className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            上一页
                          </button>
                          <button
                            onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={showingTo >= totalFilteredUsers}
                            className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            下一页
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'leaderboards' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">排行榜管理</h3>
                  <div className="text-gray-600 dark:text-gray-400">
                    <p>排行榜管理功能正在开发中...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      <UserDetailModal
        userId={selectedUser || ''}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUpdate={fetchUsers}
      />
    </ProtectedRoute>
  )
}
