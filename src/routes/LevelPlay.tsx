import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GroupRow } from '../components/GroupRow'
import { CompletedRow } from '../components/CompletedRow'
import { AnimatedCompletedRow } from '../components/AnimatedCompletedRow'
import { TutorialOverlay } from '../components/TutorialOverlay'
import { WordTile } from '../components/WordTile'
import { TileDragLayer } from '../components/TileDragLayer'
import { fetchLevelData, fetchLevelIndex, clearLevelCache } from '../services/levelService'
import type { LevelIndexEntry } from '../types/levels'
import { useProgressStore } from '../store/progressStore'
import { useSessionStore, type HintType } from '../store/sessionStore'
import type { TileInstance } from '../utils/board'
import { getHintCostForUsage, getTotalHintCostForUsage } from '../constants/economy'
import { getGroupColorPreset } from '../constants/groupColors'
import {
  DIFFICULTY_CONFIG,
  formatDifficultyBadgeClasses,
  formatLevelTitle,
} from '../constants/levels'
import { getRewardsForDifficulty } from '../constants/levels'
import { getTileDisplayText, pickTranslation, getCategoryText, getTileHintText } from '../utils/translation'
import type { TranslationMap } from '../types/language'
import { useAuthContext } from '../contexts/AuthContext'
import { upsertLeaderboardEntry } from '../services/playerProgressService'

type ToolType = 'group' | 'theme' | 'assemble' | 'verify'
type ToolDialogStage = 'preview' | 'result'

// 为了向后兼容，保持现有的返回结构，但在内部使用多语言数据
type ToolResult =
  | { type: 'group'; category: TranslationMap; sample?: { text: TranslationMap; translation: string } }
  | { type: 'theme'; topics: TranslationMap[] }
  | {
      type: 'assemble'
      category: TranslationMap
      words: { id: string; text: TranslationMap; translation: string }[]
    }

interface ToolDialogState {
  type: ToolType
  stage: ToolDialogStage
  result?: ToolResult
}

const TOOL_CONFIG: Record<ToolType, { title: string; description: string; costKey: HintType }> = {
  group: {
    title: '词组提示',
    description: '查看任意一个主题及一个对应单词',
    costKey: 'group',
  },
  theme: {
    title: '主题提示',
    description: '显示两个主题，帮助快速定位方向',
    costKey: 'theme',
  },
  assemble: {
    title: '合成一组',
    description: '展示某个主题的全部 4 个单词并为其着色',
    costKey: 'autoComplete',
  },
  verify: {
    title: '查验单词',
    description: '查验一行词是否为同一主题，需要点击一个词确认',
    costKey: 'verify',
  },
}

const TOOL_ORDER: ToolType[] = ['group', 'theme', 'assemble', 'verify']

export const LevelPlay = () => {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [levelMeta, setLevelMeta] = useState<LevelIndexEntry | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [completionReported, setCompletionReported] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [toolDialog, setToolDialog] = useState<ToolDialogState | null>(null)
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [replayNotice, setReplayNotice] = useState(false)
  const [nextLevelId, setNextLevelId] = useState<string | null>(null)
  const [showCompletionPanel, setShowCompletionPanel] = useState(false)
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isPlayingCompletionAnimation, setIsPlayingCompletionAnimation] = useState(false)
  const [animatingGroupId, setAnimatingGroupId] = useState<string | null>(null)

  const level = useSessionStore((state) => state.level)
  const tiles = useSessionStore((state) => state.tiles)
  const columns = useSessionStore((state) => state.columns)
  const completedGroups = useSessionStore((state) => state.completedGroups)
  const status = useSessionStore((state) => state.status)
  const hints = useSessionStore((state) => state.hints)
  const hintState = useSessionStore((state) => state.hintState)
  const activeTile = useSessionStore((state) => state.activeTile)
  const groupColorAssignments = useSessionStore((state) => state.groupColors)
  const tileColorOverrides = useSessionStore((state) => state.tileColorOverrides)
  const revealedCategories = useSessionStore((state) => state.revealedCategories)
  const freeHints = useSessionStore((state) => state.freeHints)
  const currentLevelId = useSessionStore((state) => state.currentLevelId)
  const sessionStartedAt = useSessionStore((state) => state.startedAt)

  const initialize = useSessionStore((state) => state.initialize)
  const reorder = useSessionStore((state) => state.reorder)
  const selectTile = useSessionStore((state) => state.selectTile)
  const groupHint = useSessionStore((state) => state.useGroupHint)
  const autoComplete = useSessionStore((state) => state.useAutoComplete)
  const revealTheme = useSessionStore((state) => state.revealTheme)
  const beginRowVerification = useSessionStore((state) => state.beginRowVerification)
  const verifyRow = useSessionStore((state) => state.verifyRow)
  const clearHighlights = useSessionStore((state) => state.clearHighlights)

  const completeLevel = useProgressStore((state) => state.completeLevel)
  const markTutorialSeen = useProgressStore((state) => state.markTutorialSeen)
  const seenTutorials = useProgressStore((state) => state.progress.seenTutorials)
  const playerProgress = useProgressStore((state) => state.progress)
  const languagePreferences = useProgressStore((state) => state.progress.languagePreferences)
  // 简化语言处理：直接使用用户偏好，确保关卡支持该语言
  const gameLanguage = useMemo(() => {
    const preferred = languagePreferences.game
    // 如果关卡支持用户偏好语言，则使用它，否则使用关卡默认支持的第一种语言
    return level?.language?.includes(preferred) ? preferred : level?.language?.[0] || 'ko'
  }, [languagePreferences.game, level?.language])

  const definitionLanguages = useMemo(() => {
    const preferred = languagePreferences.definitions
    // 过滤出关卡支持的语言
    const supported = preferred?.filter(lang => level?.language?.includes(lang)) || []
    // 如果没有支持的语言，使用关卡支持的前两种语言
    return supported.length > 0 ? supported : (level?.language?.slice(0, 2) || ['zh'])
  }, [languagePreferences.definitions, level?.language])
  const primaryDefinitionLanguage = definitionLanguages[0]
  const debugMode = useProgressStore((state) => state.debugMode)
  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked)
  const activeTileDisplayText = activeTile ? getTileDisplayText(activeTile.data, gameLanguage) : null

  const previousSnapshot = useMemo(
    () => (levelId ? playerProgress.levelSnapshots[levelId] : undefined),
    [levelId, playerProgress.levelSnapshots],
  )
  const difficultyKey = (
    level?.difficulty ?? levelMeta?.difficulty ?? 'easy'
  ) as keyof typeof DIFFICULTY_CONFIG
  const difficultyRewards = getRewardsForDifficulty(difficultyKey)
  const baseCoinTarget = difficultyRewards.coins
  
  // 保存初始的已通关状态，不让它随着进度更新而变化
  const initialClearedStateRef = useRef<Record<string, boolean>>({})
  if (levelId && !(levelId in initialClearedStateRef.current)) {
    initialClearedStateRef.current[levelId] = !!previousSnapshot?.completed
  }
  const alreadyClearedBeforeSession = levelId ? initialClearedStateRef.current[levelId] : false
  const effectiveCoinReward = alreadyClearedBeforeSession ? 0 : baseCoinTarget

  useEffect(() => {
    let cancelled = false

    if (!levelId) {
      setError('未找到该关卡')
      setLoading(false)
      return
    }

    // 检查关卡解锁状态
    if (!isLevelUnlocked(levelId)) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setAccessDenied(false)
    setMessage(null)
    setCompletionReported(false)
    setToolDialog(null)
    setAwaitingVerification(false)
    setReplayNotice(false)
    setNextLevelId(null)
    setShowCompletionPanel(false)

    // 清除缓存以确保获取最新数据
    clearLevelCache()

    fetchLevelIndex()
      .then((levels) => {
        if (cancelled) return undefined
        const meta = levels.find((item) => item.id === levelId)
        if (!meta) {
          throw new Error('关卡数据未收录')
        }
        setLevelMeta(meta)
        const metaIndex = levels.findIndex((item) => item.id === levelId)
        const upcoming = metaIndex >= 0 && metaIndex + 1 < levels.length ? levels[metaIndex + 1] : null
        setNextLevelId(upcoming?.id ?? null)
        return fetchLevelData(meta.id)
      })
      .then((levelFile) => {
        if (!levelFile || cancelled) return
        const snapshot = useProgressStore.getState().progress.levelSnapshots[levelId]
        initialize(levelFile, levelId, { freeHints: !!snapshot?.completed })
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.error(err)
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
  }, [initialize, levelId, isLevelUnlocked])

  // 定期检查数据更新
  useEffect(() => {
    if (!levelId || !level) return
    
    const checkForUpdates = () => {
      clearLevelCache()
      fetchLevelData(levelId)
        .then((newLevelData) => {
          if (JSON.stringify(newLevelData) !== JSON.stringify(level)) {
            setUpdateAvailable(true)
          }
        })
        .catch(console.error)
    }

    // 每5分钟检查一次更新
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [levelId, level, levelMeta])

  useEffect(() => {
    if (!level || !levelId) return
    const tutorialKey = levelId
    const legacyKey = `level-${levelId}`
    const alreadySeen =
      seenTutorials.includes(tutorialKey) || seenTutorials.includes(legacyKey)
    if (level.tutorialSteps?.length && !alreadySeen) {
      setShowTutorial(true)
    }
  }, [level, levelId, seenTutorials])

  useEffect(() => {
    if (!levelId) return
    const tutorialKey = levelId
    const legacyKey = `level-${levelId}`
    if (seenTutorials.includes(legacyKey) && !seenTutorials.includes(tutorialKey)) {
      markTutorialSeen(tutorialKey)
    }
  }, [levelId, markTutorialSeen, seenTutorials])

  useEffect(() => {
    if (alreadyClearedBeforeSession) {
      setReplayNotice(true)
    }
  }, [alreadyClearedBeforeSession])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 2600)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!hintState.highlightedTileIds.length) return
    const timer = window.setTimeout(() => clearHighlights(), 2800)
    return () => window.clearTimeout(timer)
  }, [hintState.highlightedTileIds, clearHighlights])

  useEffect(() => {
    // 确保只在当前关卡完成时触发，避免切换关卡时的时序问题
    if (!level || !levelId || status !== 'completed' || completionReported || currentLevelId !== levelId) return
    const completionTimeMs =
      typeof sessionStartedAt === 'number' ? Math.max(1, Date.now() - sessionStartedAt) : undefined
    completeLevel({
      levelId,
      completedGroupIds: completedGroups.map((group) => group.group.id),
      coinsReward: effectiveCoinReward,
      hintsUsed: hints,
      unlockLevelId: nextLevelId ?? undefined,
      freeHintMode: freeHints,
      completionTimeMs,
    })
    setCompletionReported(true)
    if (user && completionTimeMs) {
      const totalHintsUsed = Object.values(hints).reduce(
        (sum: number, count) => sum + count,
        0,
      )
      void upsertLeaderboardEntry({
        userId: user.id,
        levelId,
        completionTimeMs,
        coinsEarned: effectiveCoinReward,
        hintsSpent: totalHintsUsed,
      }).catch((err) => {
        console.error('排行榜同步失败', err)
      })
    }
    setMessage(
      alreadyClearedBeforeSession
        ? '🎉 再次通关，本次不再奖励金币，提示保持免费'
        : '🎉 恭喜完成关卡！',
    )
  }, [
    alreadyClearedBeforeSession,
    completeLevel,
    completionReported,
    completedGroups,
    currentLevelId,
    effectiveCoinReward,
    hints,
    freeHints,
    level,
    levelId,
    nextLevelId,
    status,
    sessionStartedAt,
    user,
  ])

  useEffect(() => {
    if (status === 'completed' && !isPlayingCompletionAnimation) {
      // Check if this is the final completion (all groups completed)
      if (level && completedGroups.length === level.groups.length) {
        setIsPlayingCompletionAnimation(true)
        // Find the last completed group to animate
        const lastCompletedGroup = completedGroups[completedGroups.length - 1]
        if (lastCompletedGroup) {
          setAnimatingGroupId(lastCompletedGroup.group.id)
          // Start animation sequence
          setTimeout(() => {
            setShowCompletionPanel(true)
            setIsPlayingCompletionAnimation(false)
            setAnimatingGroupId(null)
          }, 3000) // 3 seconds for animation
        }
      } else {
        setShowCompletionPanel(true)
      }
    }
  }, [status, completedGroups, level, isPlayingCompletionAnimation])

  const highlightedSet = useMemo(
    () => new Set(hintState.highlightedTileIds),
    [hintState.highlightedTileIds],
  )

  const colorMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getGroupColorPreset>>()
    Object.entries(groupColorAssignments).forEach(([groupId, presetId]) => {
      const preset = getGroupColorPreset(presetId)
      if (preset) {
        map.set(groupId, preset)
      }
    })
    return map
  }, [groupColorAssignments])

  const totalTiles = useMemo(() => {
    if (!level) return 0
    return level.groups.reduce(
      (sum: number, group) => sum + group.tiles.length,
      0,
    )
  }, [level])

  const highlightPresetMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getGroupColorPreset>>()
    Object.entries(hintState.tileHighlightPresets ?? {}).forEach(([tileId, presetId]) => {
      const preset = getGroupColorPreset(presetId)
      if (preset) {
        map.set(tileId, preset)
      }
    })
    return map
  }, [hintState.tileHighlightPresets])

  const tileOverrideMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getGroupColorPreset>>()
    Object.entries(tileColorOverrides).forEach(([tileId, presetId]) => {
      const preset = getGroupColorPreset(presetId)
      if (preset) {
        map.set(tileId, preset)
      }
    })
    return map
  }, [tileColorOverrides])

  const difficultyConfig = DIFFICULTY_CONFIG[difficultyKey]

  const totalHintCost = useMemo(() => {
    if (freeHints) return 0
    return (
      getTotalHintCostForUsage('group', hints.group) +
      getTotalHintCostForUsage('theme', hints.theme) +
      getTotalHintCostForUsage('autoComplete', hints.autoComplete) +
      getTotalHintCostForUsage('verify', hints.verify)
    )
  }, [freeHints, hints])

  const netCoinReward = useMemo(
    () => Math.max(0, effectiveCoinReward - totalHintCost),
    [effectiveCoinReward, totalHintCost],
  )

  const hintSummary: { key: string; label: string; value: number }[] = [
    { key: 'group', label: '词组', value: hints.group },
    { key: 'theme', label: '主题', value: hints.theme },
    { key: 'autoComplete', label: '合成', value: hints.autoComplete },
    { key: 'verify', label: '查验', value: hints.verify },
  ]

  const translatedTitle =
    level?.content.title
      ? pickTranslation(level.content.title, languagePreferences.game)
      : null
  const title =
    translatedTitle ??
    (levelMeta?.title ?? (levelId ? formatLevelTitle(levelId) : '关卡'))

  const getGroupCategory = (groupId?: string) => {
    if (!groupId || !level) return '同组'
    const category = level.groups.find((group) => group.id === groupId)?.category
    return category ? getCategoryText(category, gameLanguage) : '同组'
  }

  const getToolCost = (type: ToolType) => {
    const costKey = TOOL_CONFIG[type].costKey
    const usageCount = hints[costKey] ?? 0
    if (freeHints) return 0
    return getHintCostForUsage(costKey, usageCount)
  }

  const handleRestartLevel = () => {
    if (!level || !levelId) return
    const snapshot = useProgressStore.getState().progress.levelSnapshots[levelId]
    initialize(level, levelId, { forceRestart: true, freeHints: !!snapshot?.completed })
    setShowRestartConfirm(false)
    setMessage('已重新开始关卡')
  }

  const handleTileClick = (tile: TileInstance, tileIndex: number) => {
    selectTile(tile.instanceId)
    if (!awaitingVerification) return
    const rowIndex = Math.floor(tileIndex / columns)
    const result = verifyRow(rowIndex)
    setAwaitingVerification(false)
    if (result.reason === 'invalid-row') {
      setMessage('该行不足四个词，无法查验')
      return
    }
    if (result.reason === 'not-ready') {
      return
    }
    if (result.success) {
      const category = getGroupCategory(result.groupId)
      setMessage(`✅ 已确认主题「${category}」，颜色将保留`)
    } else {
      setMessage('该行已着色，请继续调整')
    }
  }

  const openToolDialog = (type: ToolType) => {
    setToolDialog({ type, stage: 'preview' })
  }

  const closeToolDialog = () => {
    setToolDialog(null)
  }

  const handleConfirmTool = () => {
    if (!toolDialog) return
    const { type } = toolDialog
    const cost = getToolCost(type)

    if (type === 'group') {
      const result = groupHint()
      if (!result.success) {
        if (result.reason === 'insufficient-coins') {
          setMessage(
            cost > 0 ? `金币不足，词组提示需要 ${cost} 金币` : '复盘模式下提示免费，无需金币',
          )
        } else {
          setMessage('所有分组都已完成！')
        }
        closeToolDialog()
        return
      }
      setToolDialog({
        type,
        stage: 'result',
        result: {
          type: 'group',
          category: result.category,
          sample: result.sample,
        },
      })
      setMessage(`已为主题「${getCategoryText(result.category, gameLanguage)}」着色，快去找齐一行！`)
      return
    }

    if (type === 'theme') {
      const result = revealTheme()
      if (!result.success) {
        if (result.reason === 'insufficient-coins') {
          setMessage(
            cost > 0 ? `金币不足，主题提示需要 ${cost} 金币` : '复盘模式下提示免费，无需金币',
          )
        } else {
          setMessage('当前无更多主题可提示')
        }
        closeToolDialog()
        return
      }
      setToolDialog({
        type,
        stage: 'result',
        result: {
          type: 'theme',
          topics: result.topics,
        },
      })
      setMessage(`给你两个灵感：${result.topics.map(topic => getCategoryText(topic, gameLanguage)).join(' · ')}`)
      return
    }

    if (type === 'assemble') {
      const result = autoComplete()
      if (!result.success) {
        if (result.reason === 'insufficient-coins') {
          setMessage(
            cost > 0 ? `金币不足，合成一组需要 ${cost} 金币` : '复盘模式下提示免费，无需金币',
          )
        } else {
          setMessage('没有尚未完成的主题可展示')
        }
        closeToolDialog()
        return
      }
      const targetGroup = level?.groups.find((group) => group.id === result.groupId)
      const words =
        targetGroup?.tiles.map((tile) => ({
          id: tile.id,
          text: tile.text,
          translation: pickTranslation(
            tile.text,
            primaryDefinitionLanguage,
            definitionLanguages.slice(1),
          ),
        })) ??
        result.tileIds
          .map((id) => tiles.find((tile) => tile.instanceId === id))
          .filter(Boolean)
          .map((tile) => ({
            id: tile!.instanceId,
            text: tile!.data.text,
            translation: pickTranslation(
              tile!.data.text,
              primaryDefinitionLanguage,
              definitionLanguages.slice(1),
            ),
          }))

      setToolDialog({
        type,
        stage: 'result',
        result: {
          type: 'assemble',
          category: result.category,
          words,
        },
      })
      setMessage(`主题「${getCategoryText(result.category, gameLanguage)}」的词块已点亮`)
      return
    }

    // verify
    const result = beginRowVerification()
    if (!result.success) {
      setMessage(
        result.reason === 'insufficient-coins'
          ? cost > 0
            ? `金币不足，查验需要 ${cost} 金币`
            : '复盘模式下提示免费，无需金币'
          : '仍有查验在进行，请先点击一行词块完成查验',
      )
      closeToolDialog()
      return
    }
    setAwaitingVerification(true)
    setMessage('选择任意一行中的词块，即可查验这一行是否正确')
    closeToolDialog()
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <span className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm text-slate-500">正在装载词场……</p>
      </main>
    )
  }

  if (accessDenied) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-amber-600">关卡未解锁</h1>
        <p className="max-w-md text-sm text-slate-600">
          该关卡尚未解锁，请先完成前面的关卡
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-primary/90"
        >
          返回关卡列表
        </button>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-primary">关卡加载失败</h1>
        <p className="max-w-md text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-white shadow-lg"
        >
          返回关卡列表
        </button>
      </main>
    )
  }

  const handleRefreshLevel = () => {
    if (!levelId || !level) return
    setUpdateAvailable(false)
    clearLevelCache()
    window.location.reload()
  }

  return (
    <main className="page-enter-animation mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 p-3 pb-16 xs:gap-3.5 xs:p-3.5 sm:gap-4 sm:p-4 md:gap-4 md:p-4 lg:max-w-6xl lg:gap-5 lg:p-6 xl:max-w-7xl xl:gap-6 xl:p-8 2xl:max-w-8xl 2xl:gap-7 2xl:p-10 ipad:pb-20 bg-background dark:bg-dark-background">
      <TileDragLayer />
      {updateAvailable && (
        <div className="fade-in-up flex items-center justify-between rounded-3xl bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-2.5 shadow-soft ring-1 ring-primary/20 hover-lift-sm transition-smooth backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div>
              <div className="text-sm font-semibold text-primary">题目数据已更新</div>
              <div className="text-xs text-slate-600">建议刷新页面获取最新内容</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefreshLevel}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            刷新
          </button>
        </div>
      )}
      <header className="fade-in-up flex flex-col gap-2.5 rounded-3xl bg-surface/90 px-3 py-2.5 shadow-medium backdrop-blur-lg dark:bg-dark-surface dark:shadow-dark-tile sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:px-4 md:py-3 lg:px-5 lg:py-4 xl:px-6 xl:py-5 ipad:gap-4 transition-smooth">
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary transition-smooth hover:bg-primary/20 hover-scale-sm dark:bg-dark-primary/20 dark:text-dark-primary dark:hover:bg-dark-primary/30 md:px-3 md:py-1.5 md:text-sm lg:px-4 lg:py-2 lg:text-base"
            >
              ← 返回
            </button>
            <button
              type="button"
              onClick={() => setShowRestartConfirm(true)}
              className="rounded-full bg-amber-100 px-2.5 py-1.5 text-sm font-medium text-amber-700 transition-smooth hover:bg-amber-200 hover-scale-sm dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 md:px-3 md:py-1.5 md:text-sm lg:px-4 lg:py-2 lg:text-base"
            >
              重新开始
            </button>
          </div>
          <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-dark-surfaceSecondary dark:text-dark-text">
            金币 {debugMode ? '∞' : playerProgress.coins}
          </span>
          {debugMode && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              调试
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-dark-text sm:text-2xl md:text-2xl ipad:text-3xl">{title}</h1>
          <span
            className={clsx(
              'rounded-full px-3 py-0.5 text-xs font-semibold',
              formatDifficultyBadgeClasses(difficultyKey),
            )}
          >
            难度：{difficultyConfig.label}
          </span>
        </div>
        <div className="flex w-full flex-col items-center gap-1 sm:w-auto sm:items-end">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-dark-textMuted">提示使用</div>
          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-end">
            {hintSummary.map((item) => (
              <span
                key={item.key}
                className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:shadow-none"
              >
                {item.label} {item.value}
              </span>
            ))}
          </div>
        </div>
      </header>

      {(replayNotice || revealedCategories.length > 0) && (
        <div className="space-y-1.5">
          {replayNotice && (
            <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-inner dark:bg-dark-surfaceSecondary dark:text-dark-textMuted dark:shadow-none">
              本关已通关，再次游玩不再获得金币奖励，提示免费
            </div>
          )}
          {revealedCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-sm text-amber-700 shadow-inner dark:bg-amber-900/20 dark:text-amber-400 dark:shadow-none">
              <span className="font-semibold">已知主题：</span>
              {revealedCategories.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-amber-700 shadow-sm dark:bg-dark-surfaceSecondary dark:text-amber-400 dark:shadow-none"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-[2fr_1fr] md:gap-4 ipad:gap-5 ipad:grid-cols-[3fr_2fr] ipad:landscape:grid-cols-[4fr_3fr] ipad:landscape:gap-6">
        <div className="flex flex-col gap-3">
          <div
            className={clsx(
              'grid gap-2 rounded-3xl bg-surface/70 p-3 shadow-inner backdrop-blur dark:bg-dark-surface dark:shadow-none',
              tiles.length === 0 && 'place-items-center py-16',
              // 移动端优化
              'touch-manipulation md:p-4 md:gap-2.5 ipad:p-5 ipad:gap-3 ipad:landscape:p-6'
            )}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              touchAction: 'manipulation'
            }}
          >
            {tiles.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-dark-textMuted">词场已清空，等待庆祝🎉</div>
            ) : (
              tiles.map((tile, index) => {
                const rowIndex = Math.floor(index / columns)
                const colIndex = index % columns
                const isRowStart = colIndex === 0
                const isCompleted = tile.status === 'completed'

                // 如果是完成的行且是行首，检查整行是否都完成
                if (isCompleted && isRowStart) {
                  const rowStart = rowIndex * columns
                  const rowTiles = tiles.slice(rowStart, rowStart + columns)
                  // 检查这一行是否都是同一组且都完成了
                  if (rowTiles.length === columns && rowTiles.every((t) => t.status === 'completed' && t.groupId === tile.groupId)) {
                    const completedGroup = completedGroups.find((g) => g.group.id === tile.groupId)
                    if (completedGroup) {
                      const isAnimatingGroup = isPlayingCompletionAnimation && animatingGroupId === tile.groupId
                      const RowComponent = isAnimatingGroup ? AnimatedCompletedRow : CompletedRow
                      return (
                        <RowComponent
                          key={`completed-${tile.groupId}-${rowIndex}`}
                          group={completedGroup}
                          colorPreset={colorMap.get(tile.groupId)}
                          columns={columns}
                          wordLanguage={gameLanguage}
                          isAnimating={isAnimatingGroup}
                        />
                      )
                    }
                  }
                }

                // 如果是完成行的非首位，跳过渲染（已经被 CompletedRow 渲染了）
                if (isCompleted && colIndex > 0) {
                  const rowStart = rowIndex * columns
                  const rowTiles = tiles.slice(rowStart, rowStart + columns)
                  if (rowTiles.length === columns && rowTiles.every((t) => t.status === 'completed' && t.groupId === tile.groupId)) {
                    return null
                  }
                }

                return (
                  <WordTile
                    key={tile.instanceId}
                    tile={tile}
                    index={index}
                    moveTile={reorder}
                    onClick={handleTileClick}
                    wordLanguage={gameLanguage}
                    isHighlighted={highlightedSet.has(tile.instanceId)}
                    highlightContext={hintState.highlightContext}
                    highlightPreset={highlightPresetMap.get(tile.instanceId)}
                    groupColor={colorMap.get(tile.groupId)}
                    tileOverrideColor={tileOverrideMap.get(tile.instanceId)}
                  />
                )
              })
            )}
          </div>

          <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface/90 p-2.5 shadow-inner backdrop-blur dark:bg-dark-surface dark:shadow-none md:p-3 md:gap-2.5 ipad:p-4 ipad:gap-3">
            <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-2 md:gap-2.5 ipad:gap-3 ipad:grid-cols-4 ipad:landscape:flex">
              {TOOL_ORDER.map((tool) => {
                const config = TOOL_CONFIG[tool]
                const isVerify = tool === 'verify'
                const disabled = isVerify && awaitingVerification
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => openToolDialog(tool)}
                    disabled={disabled}
                    className={clsx(
                      'flex w-full items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition sm:w-auto md:px-3.5 md:py-2 ipad:px-4 ipad:py-2.5 ipad:text-sm',
                      tool === 'group' && 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-dark-primary/20 dark:text-dark-primary dark:hover:bg-dark-primary/30',
                      tool === 'theme' && 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50',
                      tool === 'assemble' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50',
                      tool === 'verify' && 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50',
                      disabled && 'cursor-not-allowed opacity-50 hover:bg-sky-100 dark:hover:bg-sky-900/30',
                    )}
                  >
                    <span>{config.title}</span>
                    {isVerify && awaitingVerification && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">等待点击</span>
                    )}
                  </button>
                )
              })}
            </div>
            {message && <span className="text-center text-xs text-slate-500 dark:text-dark-textMuted">{message}</span>}
          </div>
        </div>

        <aside className="flex h-full flex-col gap-3 md:gap-4 ipad:gap-5">
          <div className="flex flex-1 flex-col gap-2 rounded-3xl bg-surface/90 p-3 shadow-inner backdrop-blur dark:bg-dark-surface dark:shadow-none md:p-4 md:gap-3 ipad:p-5 ipad:gap-4">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-dark-text">词牌详情</h2>
            {activeTile ? (
              <>
                <div className="flex flex-col items-center rounded-2xl bg-white/90 p-3 text-center shadow md:p-4 md:px-6 ipad:p-5 ipad:px-8 dark:bg-dark-surfaceSecondary dark:shadow-none">
                  <div className="mt-0.5 text-2xl font-semibold text-slate-800 dark:text-dark-text md:text-3xl ipad:text-4xl">
                    {activeTileDisplayText}
                  </div>
                  {activeTile.data.text && activeTile.data.text[gameLanguage] && activeTileDisplayText !== activeTile.data.text[gameLanguage] && (
                    <div className="text-xs text-slate-500 dark:text-dark-textMuted">
                      {gameLanguage.toUpperCase()}：{activeTile.data.text[gameLanguage]}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  {definitionLanguages.map((lang) => {
                    const text = activeTile.data.text?.[lang]
                    const isPreferred = lang === primaryDefinitionLanguage
                    return (
                      <div
                        key={lang}
                        className="flex items-center justify-between rounded-xl bg-white/70 px-2.5 py-1.5 text-sm text-slate-600 dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary md:px-3 md:py-2 md:text-sm ipad:px-4 ipad:py-2.5 ipad:text-base"
                      >
                        <span className={clsx('font-medium', isPreferred && 'text-primary dark:text-dark-primary')}>
                          {lang.toUpperCase()}
                        </span>
                        <span
                          className={clsx(
                            isPreferred && 'text-slate-900 font-semibold dark:text-dark-text',
                            !text && 'text-slate-400 dark:text-dark-textMuted',
                          )}
                        >
                          {text ?? '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {activeTile.data.hint && (
                  <div className="rounded-xl bg-yellow-100/70 px-2.5 py-1.5 text-sm text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    提示：{getTileHintText(activeTile.data, gameLanguage)}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-dark-textMuted">
                点击词牌可查看释义
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-3xl bg-surface/90 p-3 shadow-inner backdrop-blur dark:bg-dark-surface dark:shadow-none md:p-4 md:gap-3 ipad:p-5 ipad:gap-4">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-dark-text">已完成分组</h2>
            {completedGroups.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-dark-textMuted">暂未完成任何分组，加油！</p>
            ) : (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                {completedGroups.map((group) => (
                  <GroupRow
                    key={group.group.id}
                    group={group}
                    colorPreset={colorMap.get(group.group.id)}
                    wordLanguage={gameLanguage}
                    definitionLanguages={definitionLanguages}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

      {status === 'completed' && level && (
        <>
          {showCompletionPanel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-3 py-4 backdrop-blur sm:px-4 sm:py-10 md:px-6 md:py-12 ipad:px-8 ipad:py-16">
              <div className="flex w-full max-w-4xl flex-col gap-3 overflow-hidden rounded-3xl bg-white/95 p-4 shadow-2xl ring-1 ring-slate-100 sm:gap-5 sm:rounded-4xl sm:p-6 md:p-8 mx-4 max-h-[90vh] overflow-y-auto ipad:max-w-6xl ipad:gap-6 ipad:p-8 ipad:rounded-4xl ipad:max-h-[85vh]">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="text-xs font-semibold text-primary sm:text-sm">🎉 关卡完成</div>
                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl md:text-3xl">
                      {title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 sm:gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:px-3 sm:py-1 sm:text-[11px] ${formatDifficultyBadgeClasses(difficultyKey)}`}
                      >
                        难度·{difficultyConfig.label}
                      </span>
                      {alreadyClearedBeforeSession && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:px-3 sm:py-1 sm:text-[11px]">
                          复盘模式
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 sm:gap-2 md:gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 sm:px-4 sm:py-2 sm:text-sm"
                    >
                      返回
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCompletionPanel(false)}
                      className="rounded-full bg-white px-2.5 py-1.5 text-xs text-slate-400 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-600 sm:px-4 sm:py-2 sm:text-sm"
                    >
                      收起
                    </button>
                  </div>
                </header>

                <section className="grid grid-cols-3 gap-1.5 sm:gap-3">
                  <div className="rounded-xl bg-slate-100 px-2 py-1.5 text-sm text-slate-700 sm:rounded-3xl sm:px-4 sm:py-3">
                    <div className="text-[9px] uppercase tracking-wide text-slate-400 sm:text-xs">奖励</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900 sm:mt-1 sm:text-lg">
                      {alreadyClearedBeforeSession ? '—' : `${effectiveCoinReward}`}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-2 py-1.5 text-sm text-slate-700 sm:rounded-3xl sm:px-4 sm:py-3">
                    <div className="text-[9px] uppercase tracking-wide text-slate-400 sm:text-xs">消耗</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900 sm:mt-1 sm:text-lg">
                      {freeHints ? '免费' : `${totalHintCost}`}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-2 py-1.5 text-sm text-slate-700 sm:rounded-3xl sm:px-4 sm:py-3">
                    <div className="text-[9px] uppercase tracking-wide text-slate-400 sm:text-xs">净收益</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900 sm:mt-1 sm:text-lg">
                      {freeHints ? `${effectiveCoinReward}` : `${netCoinReward}`}
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-2 overflow-hidden sm:gap-3">
                  <header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 sm:text-lg">关卡词汇总览</h3>
                      <p className="text-xs text-slate-500 sm:text-sm">共 {totalTiles} 个词条，按主题整理</p>
                    </div>
                    <div className="hidden text-xs text-slate-400 sm:block">
                      长按可复制
                    </div>
                  </header>
                  <div className="flex max-h-[50vh] flex-col gap-2.5 overflow-y-auto pr-1 sm:max-h-[45vh] sm:gap-3">
                    {level.groups.map((group) => {
                      const preset =
                        colorMap.get(group.id) ??
                        (group.colorPreset ? getGroupColorPreset(group.colorPreset) : undefined)
                      return (
                        <div
                          key={group.id}
                          className="flex flex-col gap-2 rounded-2xl border p-3 shadow-sm sm:gap-3 sm:rounded-3xl sm:p-4"
                          style={{
                            backgroundColor: preset?.background ?? 'rgba(248,250,252,0.85)',
                            borderColor: preset?.border ?? 'rgba(148,163,184,0.35)',
                            color: preset?.text,
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-[10px] uppercase tracking-wide opacity-75 sm:text-xs">主题</div>
                              <div className="text-base font-semibold sm:text-lg">{getCategoryText(group.category, gameLanguage)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5">
                            {group.tiles.map((tile) => {
                              const primaryTranslation = pickTranslation(
                                tile.text,
                                primaryDefinitionLanguage,
                                definitionLanguages.slice(1),
                              )
                              const headlineText = pickTranslation(tile.text, gameLanguage)
                              const secondary =
                                headlineText !== primaryTranslation && primaryTranslation !== '—' ? primaryTranslation : undefined
                              return (
                                <div
                                  key={tile.id}
                                  className="flex flex-col gap-0.5 rounded-xl border px-2 py-1.5 text-sm shadow-inner sm:rounded-2xl sm:px-4 sm:py-2.5"
                                  style={{
                                    backgroundColor: preset?.rowBackground ?? 'rgba(255,255,255,0.9)',
                                    color: preset?.text ?? '#475569',
                                    borderColor: preset?.border ?? 'rgba(148,163,184,0.25)',
                                  }}
                                >
                                  <span className="text-sm font-semibold sm:text-base" style={{ color: preset?.text }}>
                                    {headlineText}
                                  </span>
                                  {secondary && (
                                    <span className="text-xs sm:text-sm" style={{ color: preset?.text ?? '#475569', opacity: 0.8 }}>
                                      {secondary}
                                    </span>
                                  )}
                                  {primaryTranslation === '—' && (
                                    <span className="text-[10px] opacity-70 sm:text-xs">该词牌为图片或特殊类型</span>
                                  )}
                                  {tile.hint && (
                                    <span className="text-[10px] text-amber-600 sm:text-xs">提示：{pickTranslation(tile.hint, gameLanguage)}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {!showCompletionPanel && (
            <div className="fixed bottom-6 right-6 z-40">
              <button
                type="button"
                onClick={() => setShowCompletionPanel(true)}
                className="rounded-full bg-slate-900/90 px-5 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-slate-900"
              >
                查看通关总结
              </button>
            </div>
          )}
        </>
      )}

      {toolDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur p-4">
          <div className="flex w-full max-w-sm mx-4 flex-col gap-4 rounded-3xl bg-white p-4 sm:p-6 shadow-2xl sm:max-w-md dark:bg-dark-surface dark:shadow-dark-tile">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-dark-text">
                {TOOL_CONFIG[toolDialog.type].title}
              </h2>
              <button
                type="button"
                onClick={closeToolDialog}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-500 hover:bg-slate-200 transition-colors dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:hover:bg-dark-border"
                aria-label="关闭"
              >
                ×
              </button>
            </header>
            {toolDialog.stage === 'preview' && (
              <>
                <p className="text-sm text-slate-600 dark:text-dark-textMuted">{TOOL_CONFIG[toolDialog.type].description}</p>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-dark-surfaceSecondary dark:text-dark-text">
                  消耗：
                  {(() => {
                    const value = getToolCost(toolDialog.type)
                    return value > 0 ? `${value} 金币` : '免费'
                  })()}
                </div>
                <footer className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeToolDialog}
                    className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-300 dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:hover:bg-dark-border"
                  >
                    再想想
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTool}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark dark:bg-dark-primary dark:hover:bg-dark-primary-dark"
                  >
                    确认使用
                  </button>
                </footer>
              </>
            )}
            {toolDialog.stage === 'result' && toolDialog.result && (
              <>
                {toolDialog.result.type === 'group' && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-600 dark:text-dark-textMuted">取到了主题线索：</div>
                    <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary dark:bg-dark-primary/20 dark:text-dark-primary">
                      {getCategoryText(toolDialog.result.category, gameLanguage)}
                    </div>
                    {toolDialog.result.sample?.text && (
                      <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-dark-surfaceSecondary dark:text-dark-textMuted">
                        例词：{pickTranslation(toolDialog.result.sample.text, gameLanguage)}
                        {toolDialog.result.sample.translation
                          ? `（${toolDialog.result.sample.translation}）`
                          : ''}
                      </div>
                    )}
                  </div>
                )}
                {toolDialog.result.type === 'theme' && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-600 dark:text-dark-textMuted">当前可能的主题：</div>
                    <div className="flex flex-wrap gap-2">
                      {toolDialog.result.topics.map((topic, index) => (
                        <span
                          key={`topic-${index}`}
                          className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          {getCategoryText(topic, gameLanguage)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {toolDialog.result.type === 'assemble' && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-600 dark:text-dark-textMuted">
                      主题「{getCategoryText(toolDialog.result.category, gameLanguage)}」的全部词块：
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {toolDialog.result.words.map((word) => (
                        <div
                          key={word.id}
                          className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 shadow-inner dark:bg-emerald-900/30 dark:text-emerald-400"
                        >
                          <div className="font-semibold">{pickTranslation(word.text, gameLanguage)}</div>
                          {word.translation && (
                            <div className="text-xs text-emerald-600 dark:text-emerald-500">{word.translation}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <footer className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeToolDialog}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark dark:bg-dark-primary dark:hover:bg-dark-primary-dark"
                  >
                    知道了
                  </button>
                </footer>
              </>
            )}
          </div>
        </div>
      )}

      <TutorialOverlay
        open={showTutorial}
        steps={
          level?.tutorialSteps?.length
            ? level.tutorialSteps
            : ['拖动词块组成一行，即可完成分组', '点击词块可查看中文释义']
        }
        gameLanguage={gameLanguage}
        onClose={() => {
          if (levelId) {
            markTutorialSeen(levelId)
          }
          setShowTutorial(false)
        }}
      />

      {showRestartConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur p-4">
          <div className="flex w-full max-w-sm mx-4 flex-col gap-4 rounded-3xl bg-white p-4 sm:p-6 shadow-2xl sm:max-w-md dark:bg-dark-surface dark:shadow-dark-tile">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-dark-text">确认重新开始？</h2>
              <button
                type="button"
                onClick={() => setShowRestartConfirm(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-500 hover:bg-slate-200 transition-colors dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:hover:bg-dark-border"
                aria-label="取消"
              >
                ×
              </button>
            </header>
            <p className="text-sm text-slate-600 dark:text-dark-textMuted">
              重新开始将清除当前进度，所有词块将重新打乱。你确定要重新开始吗？
            </p>
            <footer className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRestartConfirm(false)}
                className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-300 dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:hover:bg-dark-border"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRestartLevel}
                className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
              >
                确认重新开始
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  )
}
