import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchLevelIndex, clearLevelCache } from '../services/levelService'
import type { LevelIndexEntry } from '../types/levels'
import { useProgressStore } from '../store/progressStore'
import { animationOptimizer } from '../utils/animationOptimizer'
import {
  DIFFICULTY_CONFIG,
  formatDifficultyBadgeClasses,
  formatLevelTitle,
  getRewardsForDifficulty,
} from '../constants/levels'

export const LevelSelect = () => {
  const navigate = useNavigate()
  const progress = useProgressStore((state) => state.progress)
  const debugMode = useProgressStore((state) => state.debugMode)
  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked)
  const [levels, setLevels] = useState<LevelIndexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 定期检查数据更新
  useEffect(() => {
    const checkForUpdates = () => {
      clearLevelCache()
      fetchLevelIndex()
        .then((newLevels) => {
          if (JSON.stringify(newLevels) !== JSON.stringify(levels)) {
            setUpdateAvailable(true)
          }
        })
        .catch(console.error)
    }

    // 每5分钟检查一次更新
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [levels])

  // 性能优化：懒加载和视口检测
  useEffect(() => {
    if (!containerRef.current) return

    // 预加载动画资源
    animationOptimizer.preloadAnimations()

    // 为关卡卡片添加视口观察
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement
          if (entry.isIntersecting) {
            element.classList.add('animate-slide-in-bounce')
            observer.unobserve(element)
          }
        })
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    // 观察所有关卡卡片
    const cards = containerRef.current.querySelectorAll('[data-level-card]')
    cards.forEach((card) => observer.observe(card))

    return () => {
      observer.disconnect()
    }
  }, [levels])

  
  useEffect(() => {
    // 清除缓存以确保获取最新关卡列表
    clearLevelCache()
    
    fetchLevelIndex()
      .then(setLevels)
      .catch((err: Error) => {
        console.error(err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 bg-background dark:bg-dark-background">
        <h1 className="text-3xl font-semibold text-primary dark:text-dark-primary">脑洞外语词场</h1>
        <p className="text-sm text-slate-600 dark:text-dark-textMuted">正在加载关卡……</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center bg-background dark:bg-dark-background">
        <h1 className="text-3xl font-semibold text-primary dark:text-dark-primary">脑洞外语词场</h1>
        <p className="max-w-md text-sm text-red-500 dark:text-red-400">加载关卡列表失败：{error}</p>
      </main>
    )
  }

  const handleRefresh = () => {
    setUpdateAvailable(false)
    setLoading(true)
    clearLevelCache()
    fetchLevelIndex()
      .then(setLevels)
      .catch((err: Error) => {
        console.error(err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  return (
    <>
      <main ref={containerRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 bg-background dark:bg-dark-background sm:p-6 md:gap-7 md:p-8 ipad:max-w-5xl ipad:gap-8 ipad:p-10">
        {updateAvailable && (
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 shadow-sm ring-1 ring-primary/20 dark:from-dark-primary/10 dark:to-dark-primary/5 dark:ring-dark-primary/30">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔄</span>
              <div>
                <div className="text-sm font-semibold text-primary dark:text-dark-primary">有新内容可用</div>
                <div className="text-xs text-slate-600 dark:text-dark-textMuted">检测到题目数据已更新</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 dark:bg-dark-primary dark:hover:bg-dark-primary/80"
            >
              立即刷新
            </button>
          </div>
        )}
        <header className="relative z-20 flex flex-col gap-4 rounded-3xl bg-surface/80 p-6 shadow-tile backdrop-blur dark:bg-dark-surface dark:shadow-dark-tile md:flex-row md:items-center md:justify-between md:gap-6 md:p-8 ipad:gap-8 ipad:p-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-primary md:text-4xl ipad:text-5xl dark:text-dark-primary">脑洞外语词场</h1>
            <p className="text-sm text-slate-600 md:text-base ipad:text-lg dark:text-dark-textMuted">拖动词块，为外语学习分组</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 ipad:gap-5">
            <div className="rounded-2xl bg-white/70 px-4 py-2 text-right text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-100/70 dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:ring-dark-border">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-dark-textMuted">
                金币
              </div>
              <div className="text-lg font-semibold text-slate-800 dark:text-dark-text">
                {debugMode ? '∞' : progress.coins}
              </div>
            </div>
            {debugMode && (
              <div className="rounded-2xl bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-700 shadow-sm dark:bg-amber-900/30 dark:text-amber-400">
                调试模式
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-dark-primary/20 dark:text-dark-primary dark:hover:bg-dark-primary/30"
            >
              设置
            </button>
          </div>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 md:grid-cols-2 md:gap-6 ipad:grid-cols-3 ipad:gap-7 ipad:landscape:grid-cols-4">
          {levels.map((level: LevelIndexEntry, index) => {
            const unlocked = isLevelUnlocked(level.id)
            const snapshot = progress.levelSnapshots[level.id]
            const completed = snapshot?.completed ?? false
            const lastPlayed = snapshot?.lastPlayedAt
            const difficulty = level.difficulty
            const difficultyConfig = DIFFICULTY_CONFIG[difficulty]
            const title = formatLevelTitle(level.id)
            const previousLevel = index > 0 ? levels[index - 1] : null
            const lockedMessage = previousLevel
              ? `需先完成${formatLevelTitle(previousLevel.id)}`
              : '尚未解锁'
            const rewardCoins = getRewardsForDifficulty(level.difficulty).coins
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => {
                  if (!unlocked) return
                  navigate(`/levels/${level.id}`)
                }}
                disabled={!unlocked}
                className={`group relative flex min-h-[180px] flex-col overflow-hidden rounded-3xl border border-slate-100/70 p-6 text-left shadow-tile transition md:min-h-[200px] md:p-7 ipad:min-h-[220px] ipad:p-8 dark:border-dark-border dark:shadow-dark-tile ${
                  unlocked
                    ? 'bg-gradient-to-br from-surface/95 via-white/95 to-white text-slate-700 hover:-translate-y-1 hover:shadow-xl focus:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 dark:from-dark-surface dark:via-dark-surface dark:to-dark-surface dark:text-dark-textSecondary'
                    : 'cursor-not-allowed bg-slate-200/70 text-slate-400 dark:bg-dark-surfaceSecondary dark:text-dark-textMuted'
                }`}
              >
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold leading-tight text-slate-800 dark:text-dark-text">
                        {title}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-[3px] text-[10px] font-semibold uppercase tracking-wide shadow-sm ${
                          unlocked
                            ? formatDifficultyBadgeClasses(difficulty)
                            : 'bg-slate-300 text-slate-600 dark:bg-dark-surfaceSecondary dark:text-dark-textMuted'
                        }`}
                      >
                        难度·{difficultyConfig.label}
                      </span>
                      {completed && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-600 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-400">
                          已完成
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto flex flex-col gap-3 pt-6 text-sm font-medium text-slate-600 dark:text-dark-textMuted">
                    <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-2 text-sm shadow-sm ring-1 ring-slate-100/60 dark:bg-dark-surfaceSecondary dark:ring-dark-border">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-dark-textMuted">
                        奖励
                      </span>
                      <span className="text-base font-semibold text-slate-800 dark:text-dark-text">
                        {rewardCoins} 金币
                      </span>
                    </div>
                    {snapshot ? (
                      <div className="text-xs font-medium text-slate-500 dark:text-dark-textMuted">
                        状态：{completed ? '已完成' : '进行中'} · 最近游玩：
                        {lastPlayed ? new Date(lastPlayed).toLocaleDateString() : '—'}
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-400 dark:text-dark-textMuted">尚未游玩</div>
                    )}
                  </div>
                  <span className="mt-6 inline-flex items-center text-sm font-semibold text-primary transition group-hover:translate-x-1 dark:text-dark-primary">
                    进入关卡 →
                  </span>
                </div>
                {!unlocked && (
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/60 backdrop-blur-sm dark:bg-dark-surface/80 dark:backdrop-blur-sm">
                    <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-dark-textMuted">
                      {lockedMessage}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </section>
      </main>
    </>
  )
}
