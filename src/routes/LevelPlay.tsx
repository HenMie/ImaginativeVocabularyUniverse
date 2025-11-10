import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GroupRow } from '../components/GroupRow'
import { TutorialOverlay } from '../components/TutorialOverlay'
import { WordTile } from '../components/WordTile'
import { TileDragLayer } from '../components/TileDragLayer'
import { fetchLevelData, fetchLevelIndex } from '../services/levelService'
import type { LevelIndexEntry } from '../types/levels'
import { useProgressStore } from '../store/progressStore'
import { useSessionStore, type HintType } from '../store/sessionStore'
import type { TileInstance } from '../utils/board'
import { getHintCost } from '../constants/economy'
import { getGroupColorPreset } from '../constants/groupColors'
import {
  DIFFICULTY_CONFIG,
  formatDifficultyBadgeClasses,
  formatLevelTitle,
} from '../constants/levels'

type ToolType = 'group' | 'theme' | 'assemble' | 'verify'
type ToolDialogStage = 'preview' | 'result'

type ToolResult =
  | { type: 'group'; category: string; sample?: { text?: string; translation?: string } }
  | { type: 'theme'; topics: string[] }
  | {
      type: 'assemble'
      category: string
      words: { id: string; text?: string; translation?: string }[]
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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [levelMeta, setLevelMeta] = useState<LevelIndexEntry | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [completionReported, setCompletionReported] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [toolDialog, setToolDialog] = useState<ToolDialogState | null>(null)
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [replayNotice, setReplayNotice] = useState(false)

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

  const previousSnapshot = useMemo(
    () => (levelId ? playerProgress.levelSnapshots[levelId] : undefined),
    [levelId, playerProgress.levelSnapshots],
  )
  const baseStarTarget = level?.rewards.stars ?? levelMeta?.rewards.stars ?? 0
  const baseCoinTarget = level?.rewards.coins ?? levelMeta?.rewards.coins ?? 0
  const alreadyClearedBeforeSession = useMemo(
    () => !!previousSnapshot && baseStarTarget > 0 && previousSnapshot.starsEarned >= baseStarTarget,
    [previousSnapshot, baseStarTarget],
  )
  const effectiveCoinReward = alreadyClearedBeforeSession ? 0 : baseCoinTarget

  useEffect(() => {
    let cancelled = false

    if (!levelId) {
      setError('未找到该关卡')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)
    setCompletionReported(false)
    setToolDialog(null)
    setAwaitingVerification(false)
    setReplayNotice(false)

    fetchLevelIndex()
      .then((levels) => {
        if (cancelled) return undefined
        const meta = levels.find((item) => item.id === levelId)
        if (!meta) {
          throw new Error('关卡数据未收录')
        }
        setLevelMeta(meta)
        return fetchLevelData(meta.file)
      })
      .then((levelFile) => {
        if (!levelFile || cancelled) return
        initialize(levelFile, levelId)
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
  }, [initialize, levelId])

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
    if (!level || !levelId || status !== 'completed' || completionReported) return
    completeLevel({
      levelId,
      completedGroupIds: completedGroups.map((group) => group.group.id),
      coinsReward: effectiveCoinReward,
      starsReward: level.rewards.stars,
      hintsUsed: hints,
    })
    setCompletionReported(true)
    setMessage(
      alreadyClearedBeforeSession ? '🎉 再次通关，本次不再奖励金币' : '🎉 恭喜完成关卡！',
    )
  }, [
    alreadyClearedBeforeSession,
    completeLevel,
    completionReported,
    completedGroups,
    effectiveCoinReward,
    hints,
    level,
    levelId,
    status,
  ])

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

  const difficultyKey =
    (level?.difficulty ?? levelMeta?.difficulty ?? 'easy') as keyof typeof DIFFICULTY_CONFIG
  const difficultyConfig = DIFFICULTY_CONFIG[difficultyKey]

  const totalHintCost = useMemo(() => {
    return (
      hints.group * getHintCost('group') +
      hints.theme * getHintCost('theme') +
      hints.autoComplete * getHintCost('autoComplete') +
      hints.verify * getHintCost('verify')
    )
  }, [hints])

  const netCoinReward = useMemo(
    () => Math.max(0, effectiveCoinReward - totalHintCost),
    [effectiveCoinReward, totalHintCost],
  )

  const title = levelId ? formatLevelTitle(levelId) : level?.name ?? levelMeta?.name ?? '关卡'

  const getGroupCategory = (groupId?: string) => {
    if (!groupId || !level) return '同组'
    return level.groups.find((group) => group.id === groupId)?.category ?? '同组'
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
    const config = TOOL_CONFIG[type]
    const cost = getHintCost(config.costKey)

    if (type === 'group') {
      const result = groupHint()
      if (!result.success) {
        if (result.reason === 'insufficient-coins') {
          setMessage(`金币不足，词组提示需要 ${cost} 金币`)
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
      setMessage(`已为主题「${result.category}」着色，快去找齐一行！`)
      return
    }

    if (type === 'theme') {
      const result = revealTheme()
      if (!result.success) {
        if (result.reason === 'insufficient-coins') {
          setMessage(`金币不足，主题提示需要 ${cost} 金币`)
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
      setMessage(`给你两个灵感：${result.topics.join(' · ')}`)
      return
    }

    if (type === 'assemble') {
      const result = autoComplete()
      if (!result.success) {
        if (result.reason === 'insufficient-coins') {
          setMessage(`金币不足，合成一组需要 ${cost} 金币`)
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
          translation: tile.translations.zh ?? Object.values(tile.translations)[0],
        })) ??
        result.tileIds
          .map((id) => tiles.find((tile) => tile.instanceId === id))
          .filter(Boolean)
          .map((tile) => ({
            id: tile!.instanceId,
            text: tile!.data.text,
            translation:
              tile!.data.translations.zh ?? Object.values(tile!.data.translations)[0],
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
      setMessage(`主题「${result.category}」的词块已点亮`)
      return
    }

    // verify
    const result = beginRowVerification()
    if (!result.success) {
      setMessage(
        result.reason === 'insufficient-coins'
          ? `金币不足，查验需要 ${cost} 金币`
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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 pb-16 sm:p-6">
      <TileDragLayer />
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface/90 px-5 py-4 shadow-tile backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
          >
            ← 返回
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span
                className={clsx(
                  'rounded-full px-3 py-[2px] font-semibold',
                  formatDifficultyBadgeClasses(difficultyKey),
                )}
              >
                难度：{difficultyConfig.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <div>
            <div className="text-xs uppercase text-slate-400">提示使用</div>
            <div className="mt-1 text-xs text-slate-600">
              词组 {hints.group} · 主题 {hints.theme} · 合成 {hints.autoComplete} · 校验 {hints.verify}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="rounded-full bg-slate-200/60 px-3 py-1 font-medium text-slate-700">
              金币 {playerProgress.coins}
            </span>
            <span className="rounded-full bg-slate-200/60 px-3 py-1 font-medium text-slate-700">
              星星 {playerProgress.totalStars}
            </span>
          </div>
        </div>
      </header>

      {(replayNotice || revealedCategories.length > 0) && (
        <div className="space-y-2">
          {replayNotice && (
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 shadow-inner">
              本关已通关，再次游玩不再获得金币奖励
            </div>
          )}
          {revealedCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 text-sm text-amber-700 shadow-inner">
              <span className="font-semibold">已知主题：</span>
              {revealedCategories.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <div
            className={clsx(
              'grid gap-3 rounded-3xl bg-surface/70 p-4 shadow-inner backdrop-blur',
              tiles.length === 0 && 'place-items-center py-16',
            )}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {tiles.length === 0 ? (
              <div className="text-sm text-slate-500">词场已清空，等待庆祝🎉</div>
            ) : (
              tiles.map((tile, index) => (
                <WordTile
                  key={tile.instanceId}
                  tile={tile}
                  index={index}
                  moveTile={reorder}
                  onClick={handleTileClick}
                  isHighlighted={highlightedSet.has(tile.instanceId)}
                  highlightContext={hintState.highlightContext}
                  highlightPreset={highlightPresetMap.get(tile.instanceId)}
                  groupColor={colorMap.get(tile.groupId)}
                  tileOverrideColor={tileOverrideMap.get(tile.instanceId)}
                />
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-surface/90 p-4 shadow-inner backdrop-blur">
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
                    'flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition',
                    tool === 'group' && 'bg-primary/10 text-primary hover:bg-primary/20',
                    tool === 'theme' && 'bg-amber-100 text-amber-700 hover:bg-amber-200',
                    tool === 'assemble' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
                    tool === 'verify' && 'bg-sky-100 text-sky-700 hover:bg-sky-200',
                    disabled && 'cursor-not-allowed opacity-50 hover:bg-sky-100',
                  )}
                >
                  <span>{config.title}</span>
                  {isVerify && awaitingVerification && (
                    <span className="text-xs text-emerald-600">等待点击</span>
                  )}
                </button>
              )
            })}
            {message && <span className="text-xs text-slate-500">{message}</span>}
          </div>
        </div>

        <aside className="flex h-full flex-col gap-4">
          <div className="flex flex-1 flex-col gap-3 rounded-3xl bg-surface/90 p-4 shadow-inner backdrop-blur">
            <h2 className="text-sm font-semibold text-slate-600">词牌详情</h2>
            {activeTile ? (
              <>
                <div className="flex flex-col items-center rounded-2xl bg-white/90 p-4 text-center shadow">
                  <div className="mt-1 text-2xl font-semibold text-slate-800">
                    {activeTile.data.text}
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(activeTile.data.translations).map(([lang, text]) => (
                    <div
                      key={lang}
                      className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-600"
                    >
                      <span className="font-medium">
                        {lang.toLowerCase() === 'zh' ? '释义' : lang.toUpperCase()}
                      </span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                {activeTile.data.hint && (
                  <div className="rounded-2xl bg-yellow-100/70 px-3 py-2 text-sm text-yellow-700">
                    提示：{activeTile.data.hint}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                点击词牌可查看释义
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-3xl bg-surface/90 p-4 shadow-inner backdrop-blur">
            <h2 className="text-sm font-semibold text-slate-600">已完成分组</h2>
            {completedGroups.length === 0 ? (
              <p className="text-xs text-slate-500">暂未完成任何分组，加油！</p>
            ) : (
              <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                {completedGroups.map((group) => (
                  <GroupRow
                    key={group.group.id}
                    group={group}
                    colorPreset={colorMap.get(group.group.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

      {status === 'completed' && (
        <div className="fixed inset-x-0 bottom-8 flex justify-center px-4">
          <div className="flex w-full max-w-xl items-center justify-between rounded-2xl bg-slate-900 px-6 py-4 text-white shadow-xl">
            <div>
              <div className="text-sm font-semibold">关卡完成！</div>
              <div className="mt-1 text-xs text-slate-300">
                {effectiveCoinReward > 0
                  ? `获得 ${effectiveCoinReward} 金币`
                  : '本次为复盘，未获得额外金币'}
                · {level?.rewards.stars ?? 0}★
                {totalHintCost > 0 && ` · 提示消耗 ${totalHintCost} 金币`}
                {effectiveCoinReward > 0 && totalHintCost > 0 && ` · 净得 ${netCoinReward} 金币`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full bg-white px-4 py-1 text-sm font-semibold text-slate-900"
            >
              返回选择
            </button>
          </div>
        </div>
      )}

      {toolDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-white p-6 shadow-2xl">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {TOOL_CONFIG[toolDialog.type].title}
              </h2>
              <button
                type="button"
                onClick={closeToolDialog}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500 hover:bg-slate-200"
              >
                关闭
              </button>
            </header>
            {toolDialog.stage === 'preview' && (
              <>
                <p className="text-sm text-slate-600">{TOOL_CONFIG[toolDialog.type].description}</p>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                  消耗：{getHintCost(TOOL_CONFIG[toolDialog.type].costKey)} 金币
                </div>
                <footer className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeToolDialog}
                    className="rounded-full bg-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-300"
                  >
                    再想想
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTool}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark"
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
                    <div className="text-sm text-slate-600">取到了主题线索：</div>
                    <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
                      {toolDialog.result.category}
                    </div>
                    {toolDialog.result.sample?.text && (
                      <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                        例词：{toolDialog.result.sample.text}
                        {toolDialog.result.sample.translation
                          ? `（${toolDialog.result.sample.translation}）`
                          : ''}
                      </div>
                    )}
                  </div>
                )}
                {toolDialog.result.type === 'theme' && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-600">当前可能的主题：</div>
                    <div className="flex flex-wrap gap-2">
                      {toolDialog.result.topics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {toolDialog.result.type === 'assemble' && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-600">
                      主题「{toolDialog.result.category}」的全部词块：
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {toolDialog.result.words.map((word) => (
                        <div
                          key={word.id}
                          className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 shadow-inner"
                        >
                          <div className="font-semibold">{word.text}</div>
                          {word.translation && (
                            <div className="text-xs text-emerald-600">{word.translation}</div>
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
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark"
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
        onClose={() => {
          if (levelId) {
            markTutorialSeen(levelId)
          }
          setShowTutorial(false)
        }}
      />
    </main>
  )
}


