
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import clsx from 'clsx'
import type { Difficulty, LevelContent, LevelIndexEntry } from '../types/levels'
import {
  clearLevelCache,
  fetchLevelData,
  fetchLevelIndex,
  upsertLevelRecord,
  deleteLevelRecord,
  checkIsAdmin,
} from '../services/levelService'
import { fetchUserDirectory, type UserDirectoryEntry } from '../services/userDirectoryService'
import {
  fetchLeaderboardEntries,
  fetchRemoteProgress,
  fetchUserLevelProgressRecords,
  type LeaderboardEntry,
  type RemoteProgressSnapshot,
  type UserLevelProgressRecord,
} from '../services/playerProgressService'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { VisualLevelEditor } from '../components/VisualLevelEditor'
import { DIFFICULTY_CONFIG, formatLevelTitle } from '../constants/levels'
import type { GroupDefinition } from '../types/levels'
import type { TranslationMap } from '../types/language'
import {
  fetchSystemSettings,
  updateSystemSettings,
  type SystemSetting,
} from '../services/systemSettingsService'

type AdminTab = 'levels' | 'users' | 'leaderboards' | 'settings'

interface LevelFormState {
  id: string
  difficulty: Difficulty
  language: string
  version: number
  isPublished: boolean
  contentText: string
}

interface LegacyLevelFile {
  id: string
  difficulty: Difficulty
  version: number
  language: string[]
  tutorialSteps?: Array<Record<string, string>>
  groups: Array<{
    id: string
    category: Record<string, string>
    colorPreset?: string
    tiles: Array<{
      id: string
      text: Record<string, string>
      hint?: Record<string, string>
    }>
  }>
  board?: {
    columns?: number
  }
  title?: Record<string, string>
  description?: Record<string, string>
}

const defaultLevelForm = (): LevelFormState => ({
  id: '',
  difficulty: 'easy',
  language: 'zh',
  version: 1,
  isPublished: false,
  contentText: JSON.stringify(
    {
      tutorialSteps: [],
      groups: [],
    } satisfies LevelContent,
    null,
    2,
  ),
})

const USER_DIRECTORY_LIMIT = 50

const LEVEL_STATUS_LABELS: Record<UserLevelProgressRecord['status'], string> = {
  locked: '未解锁',
  in_progress: '进行中',
  completed: '已完成',
}

const formatLeaderboardTime = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '—'
  }
  const seconds = Math.floor(value / 1000)
  const millis = value % 1000
  return `${seconds}秒 ${millis}毫秒`
}

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
export function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('levels')

  const [levels, setLevels] = useState<LevelIndexEntry[]>([])
  const [levelsLoading, setLevelsLoading] = useState(true)
  const [levelsError, setLevelsError] = useState<string | null>(null)
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null)
  const [levelForm, setLevelForm] = useState<LevelFormState>(defaultLevelForm)
  const [savingLevel, setSavingLevel] = useState(false)
  const [importingLegacy, setImportingLegacy] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [useVisualEditor, setUseVisualEditor] = useState(true) // 默认使用可视化编辑器

  const [userDirectory, setUserDirectory] = useState<UserDirectoryEntry[]>([])
  const [userLoading, setUserLoading] = useState(true)
  const [userError, setUserError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)
  const [userDetailError, setUserDetailError] = useState<string | null>(null)
  const [userProgress, setUserProgress] = useState<RemoteProgressSnapshot | null>(null)
  const [userLevelProgress, setUserLevelProgress] = useState<UserLevelProgressRecord[]>([])

  const [selectedLeaderboardLevel, setSelectedLeaderboardLevel] = useState<string | null>(null)
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)

  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([])
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  const loadLevels = async () => {
    setLevelsLoading(true)
    setLevelsError(null)
    clearLevelCache()
    try {
      const data = await fetchLevelIndex({ includeDrafts: true })
      setLevels(data)
      if (!selectedLeaderboardLevel && data.length > 0) {
        setSelectedLeaderboardLevel(data[0]?.id ?? null)
      }
    } catch (error) {
      setLevelsError((error as Error).message)
    } finally {
      setLevelsLoading(false)
    }
  }

  const loadUserDirectory = async (searchValue?: string) => {
    setUserLoading(true)
    setUserError(null)
    try {
      const directory = await fetchUserDirectory({
        search: searchValue?.trim() || undefined,
        limit: USER_DIRECTORY_LIMIT,
      })
      setUserDirectory(directory)
      setSelectedUserId((previous) => {
        if (previous && directory.some((entry) => entry.userId === previous)) {
          return previous
        }
        return directory[0]?.userId ?? null
      })
    } catch (error) {
      setUserError((error as Error).message)
      setUserDirectory([])
      setSelectedUserId(null)
    } finally {
      setUserLoading(false)
    }
  }

  const loadUserDetail = async (userId: string) => {
    setUserDetailLoading(true)
    setUserDetailError(null)
    try {
      const [progressSnapshot, levelRecords] = await Promise.all([
        fetchRemoteProgress(userId),
        fetchUserLevelProgressRecords(userId),
      ])
      setUserProgress(progressSnapshot)
      setUserLevelProgress(levelRecords)
    } catch (error) {
      setUserDetailError((error as Error).message)
      setUserProgress(null)
      setUserLevelProgress([])
    } finally {
      setUserDetailLoading(false)
    }
  }

  const loadLeaderboard = async (levelId: string | null) => {
    if (!levelId) {
      setLeaderboardEntries([])
      return
    }
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    try {
      const data = await fetchLeaderboardEntries(levelId, 20)
      setLeaderboardEntries(data)
    } catch (error) {
      setLeaderboardError((error as Error).message)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  const loadSystemSettings = async () => {
    setSettingsLoading(true)
    setSettingsError(null)
    try {
      const data = await fetchSystemSettings()
      setSystemSettings(data)
    } catch (error) {
      setSettingsError((error as Error).message)
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleSaveSystemSettings = async () => {
    setSavingSettings(true)
    try {
      const updates = systemSettings.map((setting) => ({
        key: setting.key,
        value: setting.value,
      }))
      await updateSystemSettings(updates)
      alert('系统设置保存成功!')
      await loadSystemSettings()
    } catch (error) {
      alert(`保存失败：${(error as Error).message}`)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSettingChange = (key: string, value: boolean | string | number | object) => {
    setSystemSettings((prev) =>
      prev.map((setting) => (setting.key === key ? { ...setting, value } : setting)),
    )
  }
  // 初始化数据加载
  useEffect(() => {
    let cancelled = false

    const initializeData = async () => {
      try {
        // 检查管理员权限
        const adminStatus = await checkIsAdmin()
        if (!cancelled) {
          setIsAdmin(adminStatus)
          if (!adminStatus) {
            setLevelsError('您没有管理员权限。请联系管理员将您的账号添加到 admin_users 表中。')
            setLevelsLoading(false)
            return
          }
        }
        await Promise.all([loadLevels(), loadUserDirectory(), loadSystemSettings()])
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to initialize admin data:', error)
        }
      }
    }

    void initializeData()

    return () => {
      cancelled = true
    }
  }, [])

  // 当切换到 users tab 时，确保数据已加载
  useEffect(() => {
    if (activeTab === 'users' && userDirectory.length === 0 && !userLoading && !userError) {
      void loadUserDirectory()
    }
  }, [activeTab])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      if (cancelled) return
      await loadLeaderboard(selectedLeaderboardLevel)
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [selectedLeaderboardLevel])

  useEffect(() => {
    let cancelled = false

    if (!selectedUserId) {
      setUserProgress(null)
      setUserLevelProgress([])
      return
    }

    const loadData = async () => {
      if (cancelled) return
      await loadUserDetail(selectedUserId)
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [selectedUserId])

  const handleEditLevel = async (levelId: string | null) => {
    if (!levelId) {
      setEditingLevelId('new')
      setLevelForm(defaultLevelForm())
      return
    }
    try {
      const record = await fetchLevelData(levelId)
      setEditingLevelId(levelId)
      setLevelForm({
        id: record.id,
        difficulty: record.difficulty,
        language: record.language.join(','),
        version: record.version,
        isPublished: record.isPublished,
        contentText: JSON.stringify(record.content, null, 2),
      })
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const handleLevelFieldChange = (key: keyof LevelFormState, value: string | number | boolean) => {
    setLevelForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSaveLevel = async () => {
    if (!levelForm.id.trim()) {
      alert('关卡 ID 必填')
      return
    }

    // 检查管理员权限
    if (isAdmin === false) {
      alert('您没有管理员权限,无法保存关卡。\n\n请联系管理员将您的账号添加到 admin_users 表中。')
      return
    }

    let parsedContent: LevelContent
    try {
      parsedContent = JSON.parse(levelForm.contentText)
      if (!Array.isArray(parsedContent.groups)) {
        throw new Error('content.groups 必须是数组')
      }
    } catch (error) {
      alert(`JSON 无效：${(error as Error).message}`)
      return
    }
    setSavingLevel(true)
    try {
      await upsertLevelRecord({
        id: levelForm.id.trim(),
        difficulty: levelForm.difficulty,
        language: levelForm.language
          .split(',')
          .map((code) => code.trim())
          .filter(Boolean),
        version: levelForm.version,
        isPublished: levelForm.isPublished,
        content: parsedContent,
      })
      setEditingLevelId(null)
      await loadLevels()
      alert('关卡保存成功!')
    } catch (error) {
      const errorMessage = (error as Error).message
      console.error('保存关卡失败:', error)

      // 提供更详细的错误信息
      if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        alert(
          `保存失败：权限不足\n\n${errorMessage}\n\n请确保：\n1. 您已登录\n2. 您的账号在 admin_users 表中\n3. RLS 策略配置正确`,
        )
      } else {
        alert(`保存失败：${errorMessage}`)
      }
    } finally {
      setSavingLevel(false)
    }
  }

  const handleDeleteLevel = async (levelId: string) => {
    if (!confirm(`确认删除关卡 ${levelId} 吗？`)) {
      return
    }
    try {
      await deleteLevelRecord(levelId)
      await loadLevels()
    } catch (error) {
      alert(`删除失败：${(error as Error).message}`)
    }
  }

  const handleImportLegacyLevel = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      setImportingLegacy(true)
      try {
        const text = await file.text()
        const legacyData = JSON.parse(text) as LegacyLevelFile

        // 验证必要字段
        if (!legacyData.id || !legacyData.difficulty || !Array.isArray(legacyData.groups)) {
          throw new Error('无效的旧版关卡文件格式：缺少必要字段 (id, difficulty, groups)')
        }

        // 构建 LevelContent
        const content: LevelContent = {
          groups: legacyData.groups,
        }

        if (legacyData.tutorialSteps) {
          content.tutorialSteps = legacyData.tutorialSteps
        }

        if (legacyData.board) {
          content.board = legacyData.board
        }

        if (legacyData.title) {
          content.title = legacyData.title
        }

        if (legacyData.description) {
          content.description = legacyData.description
        }

        // 填充表单
        setEditingLevelId('new')
        setLevelForm({
          id: legacyData.id,
          difficulty: legacyData.difficulty,
          language: Array.isArray(legacyData.language) ? legacyData.language.join(',') : 'zh',
          version: legacyData.version || 2,
          isPublished: false,
          contentText: JSON.stringify(content, null, 2),
        })

        alert(`成功导入旧版关卡 ${legacyData.id}，请检查并保存`)
      } catch (error) {
        alert(`导入失败：${(error as Error).message}`)
      } finally {
        setImportingLegacy(false)
      }
    }
    input.click()
  }

  const handleUserSearchSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    void loadUserDirectory(userSearch)
  }

  const handleResetUserSearch = () => {
    setUserSearch('')
    void loadUserDirectory()
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
  }

  const sortedLevels = useMemo(
    () =>
      [...levels].sort((a, b) => {
        if (a.isPublished === b.isPublished) {
          return a.id.localeCompare(b.id)
        }
        return a.isPublished ? -1 : 1
      }),
    [levels],
  )

  const selectedUser = useMemo(
    () => userDirectory.find((entry) => entry.userId === selectedUserId) ?? null,
    [userDirectory, selectedUserId],
  )

  const completedLevels = useMemo(
    () => userLevelProgress.filter((record) => record.status === 'completed').length,
    [userLevelProgress],
  )

  const inProgressLevels = useMemo(
    () => userLevelProgress.filter((record) => record.status === 'in_progress').length,
    [userLevelProgress],
  )

  const sortedUserLevelProgress = useMemo(
    () =>
      [...userLevelProgress].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [userLevelProgress],
  )
  const renderLevelsTab = () => {
    if (levelsLoading) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      )
    }

    if (levelsError) {
      return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">权限不足</h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-200">{levelsError}</p>
              <div className="mt-4 rounded-2xl bg-white p-4 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  如何获取管理员权限:
                </p>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <li>登录 Supabase Dashboard</li>
                  <li>在 SQL Editor 中执行以下命令:</li>
                </ol>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-900">
                  <code className="text-slate-800 dark:text-slate-200">
                    {`-- 查看你的用户 ID\nSELECT id, email FROM auth.users;\n\n-- 添加为管理员 (替换 UUID)\nINSERT INTO public.admin_users (user_id, notes)\nVALUES ('your-user-uuid', '管理员')\nON CONFLICT (user_id) DO NOTHING;`}
                  </code>
                </pre>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  详细说明请查看 docs/设置管理员权限.md
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">线上关卡</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">通过 Supabase 统一管理</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleEditLevel(null)}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 dark:bg-dark-primary dark:hover:bg-dark-primary/80"
            >
              新建关卡
            </button>
            <button
              type="button"
              onClick={handleImportLegacyLevel}
              disabled={importingLegacy}
              className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-primary dark:text-dark-primary dark:hover:bg-dark-primary/10"
            >
              {importingLegacy ? '导入中…' : '导入旧版关卡'}
            </button>
            <button
              type="button"
              onClick={loadLevels}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              刷新
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">关卡 ID</th>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3">难度</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">更新于</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
              {sortedLevels.map((level) => {
                const difficultyMeta = DIFFICULTY_CONFIG[level.difficulty] ?? DIFFICULTY_CONFIG.easy
                return (
                  <tr key={level.id} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-3 font-mono text-slate-900 dark:text-slate-100">{level.id}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {level.title || formatLevelTitle(level.id)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{difficultyMeta.label}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold',
                          level.isPublished
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                        )}
                      >
                        {level.isPublished ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(level.updatedAt).toLocaleString('zh-CN', { hour12: false })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditLevel(level.id)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLevel(level.id)}
                          className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {editingLevelId && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingLevelId === 'new' ? '新建关卡' : `编辑 ${editingLevelId}`}
              </h3>
              <div className="flex items-center gap-3">
                {/* 编辑模式切换 */}
                <div className="flex items-center gap-2 rounded-full border border-slate-200 p-1 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setUseVisualEditor(true)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      useVisualEditor
                        ? 'bg-primary text-white dark:bg-dark-primary'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    可视化编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseVisualEditor(false)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      !useVisualEditor
                        ? 'bg-primary text-white dark:bg-dark-primary'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    JSON 编辑
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingLevelId(null)
                    setLevelForm(defaultLevelForm())
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  关闭
                </button>
              </div>
            </div>

            {useVisualEditor ? (
              // 可视化编辑器
              <div className="mt-6">
                <VisualLevelEditor
                  id={levelForm.id}
                  difficulty={levelForm.difficulty}
                  languages={levelForm.language.split(',').map((l) => l.trim()).filter(Boolean)}
                  version={levelForm.version}
                  isPublished={levelForm.isPublished}
                  groups={(() => {
                    try {
                      const content = JSON.parse(levelForm.contentText) as LevelContent
                      return content.groups || []
                    } catch {
                      return []
                    }
                  })()}
                  tutorialSteps={(() => {
                    try {
                      const content = JSON.parse(levelForm.contentText) as LevelContent
                      return content.tutorialSteps || []
                    } catch {
                      return []
                    }
                  })()}
                  onIdChange={(id) => handleLevelFieldChange('id', id)}
                  onDifficultyChange={(difficulty) => handleLevelFieldChange('difficulty', difficulty)}
                  onLanguagesChange={(languages) => handleLevelFieldChange('language', languages.join(','))}
                  onVersionChange={(version) => handleLevelFieldChange('version', version)}
                  onIsPublishedChange={(isPublished) => handleLevelFieldChange('isPublished', isPublished)}
                  onGroupsChange={(groups: GroupDefinition[]) => {
                    try {
                      const content = JSON.parse(levelForm.contentText) as LevelContent
                      const newContent: LevelContent = {
                        ...content,
                        groups,
                      }
                      handleLevelFieldChange('contentText', JSON.stringify(newContent, null, 2))
                    } catch {
                      const newContent: LevelContent = {
                        groups,
                        tutorialSteps: [],
                      }
                      handleLevelFieldChange('contentText', JSON.stringify(newContent, null, 2))
                    }
                  }}
                  onTutorialStepsChange={(steps: TranslationMap[]) => {
                    try {
                      const content = JSON.parse(levelForm.contentText) as LevelContent
                      const newContent: LevelContent = {
                        ...content,
                        tutorialSteps: steps,
                      }
                      handleLevelFieldChange('contentText', JSON.stringify(newContent, null, 2))
                    } catch {
                      const newContent: LevelContent = {
                        groups: [],
                        tutorialSteps: steps,
                      }
                      handleLevelFieldChange('contentText', JSON.stringify(newContent, null, 2))
                    }
                  }}
                  disabled={editingLevelId !== 'new'}
                />
              </div>
            ) : (
              // JSON 编辑器 (原有的表单)
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
                关卡 ID
                <input
                  type="text"
                  value={levelForm.id}
                  disabled={editingLevelId !== 'new'}
                  onChange={(event) => handleLevelFieldChange('id', event.target.value)}
                  className="mt-2 rounded-2xl border-2 border-slate-200/80 bg-white/80 px-4 py-3 text-base font-medium text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:bg-slate-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20 dark:disabled:bg-slate-700/50"
                />
              </label>
              <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
                难度
                <select
                  value={levelForm.difficulty}
                  onChange={(event) => handleLevelFieldChange('difficulty', event.target.value as Difficulty)}
                  className="mt-2 rounded-2xl border-2 border-slate-200/80 bg-white/80 px-4 py-3 text-base font-medium text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20 cursor-pointer"
                >
                  {Object.keys(DIFFICULTY_CONFIG).map((key) => (
                    <option key={key} value={key} className="py-2">
                      {DIFFICULTY_CONFIG[key as Difficulty]?.label ?? key}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
                支持语言（逗号分隔）
                <input
                  type="text"
                  value={levelForm.language}
                  onChange={(event) => handleLevelFieldChange('language', event.target.value)}
                  className="mt-2 rounded-2xl border-2 border-slate-200/80 bg-white/80 px-4 py-3 text-base font-medium text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
                />
              </label>
              <label className="flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
                版本
                <input
                  type="number"
                  min={1}
                  value={levelForm.version}
                  onChange={(event) => handleLevelFieldChange('version', Number(event.target.value))}
                  className="mt-2 rounded-2xl border-2 border-slate-200/80 bg-white/80 px-4 py-3 text-base font-medium text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
                />
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={levelForm.isPublished}
                  onChange={(event) => handleLevelFieldChange('isPublished', event.target.checked)}
                  className="h-5 w-5 rounded-lg border-2 border-slate-300 text-primary transition-smooth focus:ring-4 focus:ring-primary/20 dark:border-slate-600 dark:bg-dark-surface cursor-pointer"
                />
                对玩家可见
              </label>
            </div>

            <label className="mt-6 flex flex-col text-sm font-semibold text-slate-700 dark:text-slate-200">
              内容（JSON）
              <textarea
                rows={12}
                value={levelForm.contentText}
                onChange={(event) => handleLevelFieldChange('contentText', event.target.value)}
                className="mt-2 rounded-2xl border-2 border-slate-200/80 bg-white/80 px-4 py-3 font-mono text-sm text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20"
              />
            </label>
              </>
            )}

            {/* 保存按钮 (两种模式共用) */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingLevelId(null)
                  setLevelForm(defaultLevelForm())
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button
                type="button"
                disabled={savingLevel}
                onClick={handleSaveLevel}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-dark-primary dark:hover:bg-dark-primary/80"
              >
                {savingLevel ? '保存中…' : '保存关卡'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
  const renderUsersTab = () => {
    const showEmptyState = !userLoading && userDirectory.length === 0

    return (
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">用户总览</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">检索 Supabase Profile 并查看金币、经验与最近在线时间。</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <form onSubmit={handleUserSearchSubmit} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={userSearch}
                  placeholder="输入用户名或用户 ID"
                  onChange={(event) => setUserSearch(event.target.value)}
                  className="w-56 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 dark:bg-dark-primary dark:hover:bg-dark-primary/80"
                >
                  搜索
                </button>
                <button
                  type="button"
                  onClick={handleResetUserSearch}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  清空
                </button>
              </form>
              <button
                type="button"
                onClick={() => void loadUserDirectory(userSearch)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {userLoading ? '更新中…' : '刷新列表'}
              </button>
            </div>
          </div>

          {userError && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-200">
              加载用户失败：{userError}
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">用户名</th>
                  <th className="px-4 py-3">金币</th>
                  <th className="px-4 py-3">经验</th>
                  <th className="px-4 py-3">最近在线</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {userLoading && userDirectory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center">
                      <LoadingSpinner />
                    </td>
                  </tr>
                )}
                {userDirectory.map((entry) => (
                  <tr
                    key={entry.userId}
                    className={clsx(
                      'bg-white dark:bg-slate-900',
                      selectedUserId === entry.userId && 'bg-primary/5 dark:bg-dark-primary/20',
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {entry.username ?? '未设置'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{entry.userId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{entry.coins ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {entry.experience ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(entry.lastOnlineAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSelectUser(entry.userId)}
                        className={clsx(
                          'rounded-full px-4 py-1 text-xs font-semibold',
                          selectedUserId === entry.userId
                            ? 'bg-primary text-white dark:bg-dark-primary'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
                        )}
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
                {showEmptyState && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                      暂无用户数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {!selectedUser ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              请选择左侧的用户
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">用户详情</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedUser.userId}</p>
                </div>
                <button
                  type="button"
                  disabled={userDetailLoading}
                  onClick={() => void loadUserDetail(selectedUser.userId)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {userDetailLoading ? '载入中…' : '重新载入'}
                </button>
              </div>

              {userDetailError && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                  加载详情失败：{userDetailError}
                </div>
              )}

              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">昵称</dt>
                  <dd className="text-base font-medium text-slate-900 dark:text-slate-100">
                    {selectedUser.username ?? '未设置'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">金币</dt>
                  <dd className="text-base font-medium text-slate-900 dark:text-slate-100">
                    {userProgress?.coins ?? selectedUser.coins ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">经验</dt>
                  <dd className="text-base font-medium text-slate-900 dark:text-slate-100">
                    {userProgress?.experience ?? selectedUser.experience ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">最近在线</dt>
                  <dd className="text-base font-medium text-slate-900 dark:text-slate-100">
                    {formatDateTime(userProgress?.lastOnlineAt ?? selectedUser.lastOnlineAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">远程进度更新时间</dt>
                  <dd className="text-base font-medium text-slate-900 dark:text-slate-100">
                    {formatDateTime(userProgress?.updatedAt ?? selectedUser.progressUpdatedAt)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-xs text-slate-500 dark:text-slate-400">记录数</div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {userLevelProgress.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-xs text-slate-500 dark:text-slate-400">已完成</div>
                  <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-300">
                    {completedLevels}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <div className="text-xs text-slate-500 dark:text-slate-400">进行中</div>
                  <div className="text-lg font-semibold text-amber-600 dark:text-amber-300">
                    {inProgressLevels}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">关卡进度</h3>
                <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  {userDetailLoading && userLevelProgress.length === 0 ? (
                    <div className="flex items-center justify-center py-6">
                      <LoadingSpinner />
                    </div>
                  ) : sortedUserLevelProgress.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      暂无关卡记录
                    </div>
                  ) : (
                    sortedUserLevelProgress.map((record) => (
                      <div
                        key={`${record.levelId}-${record.updatedAt}`}
                        className="border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {record.levelId}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {LEVEL_STATUS_LABELS[record.status]}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          尝试 {record.attempts} 次 · 最佳用时{' '}
                          {record.bestTimeMs ? formatLeaderboardTime(record.bestTimeMs) : '—'}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          更新于 {formatDateTime(record.updatedAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderSettingsTab = () => {
    if (settingsLoading) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      )
    }

    if (settingsError) {
      return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-200">加载系统设置失败：{settingsError}</p>
        </div>
      )
    }

    const registrationSetting = systemSettings.find((s) => s.key === 'registration_enabled')
    const emailVerificationSetting = systemSettings.find(
      (s) => s.key === 'email_verification_required',
    )

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">系统设置</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">管理系统全局配置</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSystemSettings()}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            刷新
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {/* 注册开关 */}
          {registrationSetting && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    开放新用户注册
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {registrationSetting.description || '控制是否允许新用户注册账号'}
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={registrationSetting.value as boolean}
                    onChange={(e) =>
                      handleSettingChange('registration_enabled', e.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-700 dark:peer-checked:bg-dark-primary"></div>
                </label>
              </div>
            </div>
          )}

          {/* 邮箱验证开关 */}
          {emailVerificationSetting && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    需要邮箱验证
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {emailVerificationSetting.description ||
                      '新用户注册后是否需要通过邮箱验证才能登录'}
                  </p>
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ 关闭此选项后，新用户注册即可直接登录，无需邮箱验证
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={emailVerificationSetting.value as boolean}
                    onChange={(e) =>
                      handleSettingChange('email_verification_required', e.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:border-slate-600 dark:bg-slate-700 dark:peer-checked:bg-dark-primary"></div>
                </label>
              </div>
            </div>
          )}

          {/* 保存按钮 */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <button
              type="button"
              disabled={savingSettings}
              onClick={handleSaveSystemSettings}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-dark-primary dark:hover:bg-dark-primary/80"
            >
              {savingSettings ? '保存中…' : '保存设置'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderLeaderboardTab = () => {
    if (leaderboardLoading) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      )
    }

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">排行榜</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">各关最速记录</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedLeaderboardLevel ?? ''}
              onChange={(event) => setSelectedLeaderboardLevel(event.target.value || null)}
              className="rounded-full border-2 border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-slate-600/50 dark:bg-dark-surface/80 dark:text-slate-100 dark:hover:border-dark-primary/50 dark:focus:border-dark-primary dark:focus:ring-dark-primary/20 cursor-pointer lg:text-base lg:px-5 lg:py-2.5"
            >
              {levels.map((level) => (
                <option key={level.id} value={level.id} className="py-2">
                  {level.title || formatLevelTitle(level.id)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadLeaderboard(selectedLeaderboardLevel)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              刷新
            </button>
          </div>
        </div>

        {leaderboardError && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-200">
            获取排行榜失败：{leaderboardError}
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">玩家</th>
                <th className="px-4 py-3">用时</th>
                <th className="px-4 py-3">金币</th>
                <th className="px-4 py-3">提示</th>
                <th className="px-4 py-3">提交时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {leaderboardEntries.map((entry) => (
                <tr key={entry.id} className="bg-white dark:bg-slate-900">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {entry.username ?? entry.userId}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {formatLeaderboardTime(entry.completionTimeMs)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{entry.coinsEarned}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{entry.hintsSpent}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatDateTime(entry.submittedAt)}
                  </td>
                </tr>
              ))}
              {leaderboardEntries.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan={5}>
                    该关尚无提交
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter-animation mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 lg:max-w-7xl lg:gap-8 lg:p-8 xl:max-w-8xl xl:gap-10 xl:p-10 2xl:max-w-9xl">
      <header className="fade-in-up rounded-4xl border border-slate-200 bg-white p-6 shadow-medium dark:border-slate-700 dark:bg-slate-900 lg:p-8 xl:p-10 backdrop-blur-sm transition-smooth">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 lg:text-base">控制室</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white lg:text-3xl xl:text-4xl">管理面板</h1>
          </div>
          <div className="flex gap-2">
            {(['levels', 'users', 'leaderboards', 'settings'] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'rounded-full px-4 py-2 text-sm font-medium transition-smooth lg:px-5 lg:py-2.5 lg:text-base',
                  activeTab === tab
                    ? 'bg-primary text-white shadow-medium dark:bg-dark-primary hover-scale-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50 hover-scale-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
                )}
              >
                {tab === 'levels' && '关卡'}
                {tab === 'users' && '用户'}
                {tab === 'leaderboards' && '排行榜'}
                {tab === 'settings' && '系统设置'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeTab === 'levels' && renderLevelsTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'leaderboards' && renderLeaderboardTab()}
      {activeTab === 'settings' && renderSettingsTab()}
    </div>
  )
}


