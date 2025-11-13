import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getSupabaseAdminClient } from '../lib/supabaseAdmin'

interface UserDetailModalProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

interface UserProfile {
  id: string
  email: string
  full_name?: string
  username?: string
  avatar_url?: string
  website?: string
  created_at: string
  updated_at: string
  is_admin: boolean
}

interface UserProgress {
  id: string
  coins: number
  unlocked_level_ids: string[]
  language_preferences: Record<string, any>
  seen_tutorials: string[]
  settings: Record<string, any>
  created_at: string
  updated_at: string
  level_count?: number
  total_playtime_ms?: number
}

interface UserActivity {
  level_id: string
  created_at: string
  completion_time_ms: number
  coins_earned: number
  hints_used: Record<string, any>
}

export function UserDetailModal({ userId, isOpen, onClose, onUpdate }: UserDetailModalProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    email: ''
  })

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails()
    }
  }, [isOpen, userId])

  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      const adminClient = getSupabaseAdminClient()

      // 并行获取用户所有相关数据
      const [
        profileResult,
        progressResult,
        adminResult,
        snapshotsResult,
        activityResult
      ] = await Promise.all([
        // 获取用户基本信息
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),

        // 获取用户进度
        supabase
          .from('user_progress')
          .select('*')
          .eq('id', userId)
          .single(),

        // 获取管理员状态
        supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', userId)
          .single(),

        // 获取关卡快照
        supabase
          .from('level_snapshots')
          .select('best_time_ms')
          .eq('user_id', userId)
          .not('best_time_ms', 'is', null),

        // 获取最近活动
        supabase
          .from('leaderboards')
          .select('level_id, completion_time_ms, coins_earned, hints_used, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // 单独获取用户邮箱（如果有管理员客户端）
      let authUserResult = null
      if (adminClient) {
        authUserResult = await adminClient.auth.admin.getUserById(userId)
      }

      // 处理用户基本信息
      if (profileResult.error) throw profileResult.error
      const profile = profileResult.data

      // 获取用户邮箱（如果有管理员客户端）
      let userEmail = `用户${profile.id.slice(-8)}` // 默认值
      if (authUserResult && !authUserResult.error && authUserResult.data?.user) {
        userEmail = authUserResult.data.user.email || userEmail
      }

      // 处理用户进度
      let progress = null
      if (!progressResult.error && progressResult.data) {
        progress = progressResult.data
      }

      // 计算总游戏时长和关卡数
      let totalPlaytime = 0
      let levelCount = 0

      if (snapshotsResult.data) {
        totalPlaytime = snapshotsResult.data.reduce((sum, snapshot) => sum + (snapshot.best_time_ms || 0), 0)
        levelCount = snapshotsResult.data.length
      }

      // 设置用户基本信息
      setUserProfile({
        ...profile,
        email: userEmail,
        is_admin: !!adminResult.data
      })

      // 设置用户进度
      if (progress) {
        setUserProgress({
          ...progress,
          level_count: levelCount,
          total_playtime_ms: totalPlaytime
        })
      }

      // 设置最近活动
      if (activityResult.data) {
        setUserActivity(activityResult.data)
      }

      // 设置编辑表单
      setEditForm({
        full_name: profile.full_name || '',
        username: profile.username || '',
        email: userEmail
      })

    } catch (error) {
      console.error('获取用户详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          username: editForm.username || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      setEditing(false)
      fetchUserDetails()
      onUpdate()
      alert('用户资料已更新')
    } catch (error) {
      console.error('更新用户资料失败:', error)
      alert('更新失败')
    }
  }

  const handleResetProgress = async () => {
    if (!confirm('确定要重置该用户的所有游戏进度吗？此操作不可撤销！')) return

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
      fetchUserDetails()
      onUpdate()
    } catch (error) {
      console.error('重置进度失败:', error)
      alert('操作失败')
    }
  }

  const handleToggleAdmin = async () => {
    try {
      if (userProfile?.is_admin) {
        // Revoke admin
        await supabase
          .from('admin_users')
          .delete()
          .eq('user_id', userId)
        alert('管理员权限已撤销')
      } else {
        // Grant admin
        await supabase
          .from('admin_users')
          .upsert({
            user_id: userId,
            role: 'admin',
            permissions: ['user_management', 'content_management'],
            updated_at: new Date().toISOString()
          })
        alert('管理员权限已授予')
      }

      fetchUserDetails()
      onUpdate()
    } catch (error) {
      console.error('切换管理员权限失败:', error)
      alert('操作失败')
    }
  }

  const handleDeleteUser = async () => {
    if (!confirm('确定要删除该用户吗？此操作不可撤销，将删除所有相关数据！')) return

    try {
      // Delete all user data
      await supabase.from('level_snapshots').delete().eq('user_id', userId)
      await supabase.from('leaderboards').delete().eq('user_id', userId)
      await supabase.from('user_progress').delete().eq('id', userId)
      await supabase.from('admin_users').delete().eq('user_id', userId)
      await supabase.from('profiles').delete().eq('id', userId)

      alert('用户已删除')
      onClose()
      onUpdate()
    } catch (error) {
      console.error('删除用户失败:', error)
      alert('删除失败')
    }
  }

  const format_date = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const format_duration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds}秒`
    } else {
      return `${seconds}秒`
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              用户详情
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : userProfile && (
            <div className="space-y-6">
              {/* User Profile Section */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    基本信息
                  </h3>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editing ? '取消' : '编辑'}
                  </button>
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        用户名
                      </label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">邮箱</p>
                      <p className="font-medium text-gray-900 dark:text-white">{userProfile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">姓名</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {userProfile.full_name || '未设置'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">用户名</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {userProfile.username || '未设置'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">注册时间</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {format_date(userProfile.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">管理员权限</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userProfile.is_admin
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                      }`}>
                        {userProfile.is_admin ? '管理员' : '普通用户'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Game Progress Section */}
              {userProgress && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    游戏进度
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-600 p-3 rounded">
                      <p className="text-sm text-gray-500 dark:text-gray-400">金币</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {userProgress.coins}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-600 p-3 rounded">
                      <p className="text-sm text-gray-500 dark:text-gray-400">已完成关卡</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {userProgress.level_count || 0}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-600 p-3 rounded">
                      <p className="text-sm text-gray-500 dark:text-gray-400">已解锁关卡</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {userProgress.unlocked_level_ids?.length || 0}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-600 p-3 rounded">
                      <p className="text-sm text-gray-500 dark:text-gray-400">总游戏时长</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {userProgress.total_playtime_ms ? format_duration(userProgress.total_playtime_ms) : '0秒'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {userActivity.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    最近活动
                  </h3>
                  <div className="space-y-2">
                    {userActivity.map((activity, index) => (
                      <div key={index} className="bg-white dark:bg-gray-600 p-3 rounded flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            关卡 {activity.level_id}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format_date(activity.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {activity.coins_earned} 金币
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format_duration(activity.completion_time_ms)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={handleToggleAdmin}
                  className={`px-4 py-2 rounded-md text-white ${
                    userProfile.is_admin
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {userProfile.is_admin ? '撤销管理员权限' : '授予管理员权限'}
                </button>
                <button
                  onClick={handleResetProgress}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  重置游戏进度
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  删除用户
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
