import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchLevelIndex, clearLevelCache } from '../services/levelService'
import type { LevelIndexEntry } from '../types/levels'
import { useProgressStore } from '../store/progressStore'
import { useAuthContext } from '../contexts/AuthContext'
import { animationOptimizer } from '../utils/animationOptimizer'
import {
  DIFFICULTY_CONFIG,
  formatDifficultyBadgeClasses,
  formatLevelTitle,
  getRewardsForDifficulty,
} from '../constants/levels'

export const LevelSelect = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuthContext()
  const progress = useProgressStore((state) => state.progress)
  const debugMode = useProgressStore((state) => state.debugMode)
  const isLevelUnlocked = useProgressStore((state) => state.isLevelUnlocked)
  const progressReady = useProgressStore((state) => state.initialized)
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
    let cancelled = false
    
    // 清除缓存以确保获取最新关卡列表
    clearLevelCache()
    
    fetchLevelIndex()
      .then((data) => {
        if (!cancelled) {
          setLevels(data)
        }
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

  // 如果用户已登录但进度未准备好，显示加载状态
  if (user && !progressReady) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 bg-background dark:bg-dark-background">
        <h1 className="text-3xl font-semibold text-primary dark:text-dark-primary">脑洞外语词场</h1>
        <p className="text-sm text-slate-600 dark:text-dark-textMuted">正在同步玩家数据…</p>
      </main>
    )
  }

  const handleRefresh = () => {
    setUpdateAvailable(false)
    setLoading(true)
    setError(null)
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
      <main ref={containerRef} className="page-enter-animation mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 bg-background dark:bg-dark-background sm:p-6 md:gap-7 md:p-8 lg:max-w-6xl lg:gap-8 lg:p-10 xl:max-w-7xl xl:p-12 2xl:max-w-8xl 2xl:p-16 3xl:max-w-9xl">
        {/* 未登录用户提示 */}
        {!user && (
          <div className="fade-in-up rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 shadow-soft ring-1 ring-blue-200/50 dark:ring-blue-700/30">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    欢迎来到脑洞外语词场！
                  </h3>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    您当前处于访客模式，可以浏览关卡列表。登录后即可开始游玩、保存进度并获得奖励。
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/auth?mode=signin"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  立即登录
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-blue-600 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-700 dark:hover:bg-blue-900/50"
                >
                  注册账号
                </Link>
              </div>
            </div>
          </div>
        )}

        {updateAvailable && (
          <div className="fade-in-up flex items-center justify-between rounded-3xl bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-3 shadow-soft ring-1 ring-primary/20 dark:from-dark-primary/10 dark:to-dark-primary/5 dark:ring-dark-primary/30 hover-lift-sm transition-smooth">
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
        <header className="relative z-20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between fade-in-up">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-primary md:text-4xl lg:text-5xl xl:text-6xl dark:text-dark-primary bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              脑洞外语词场
            </h1>
            <p className="text-sm text-slate-600 md:text-base lg:text-lg xl:text-xl dark:text-dark-textMuted">
              拖动词块，为外语学习分组
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 lg:gap-5 xl:gap-6">
            {user ? (
              <>
                {/* 金币显示 */}
                <div className="group relative overflow-hidden rounded-4xl bg-gradient-to-br from-amber-50 to-yellow-50/80 px-6 py-3.5 text-center shadow-medium ring-1 ring-amber-200/50 dark:from-amber-900/20 dark:to-yellow-900/10 dark:ring-amber-700/30 backdrop-blur-sm hover-lift transition-smooth lg:px-7 lg:py-4 xl:px-8 xl:py-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-smooth"></div>
                  <div className="relative flex items-center gap-2 lg:gap-3">
                    <span className="text-2xl lg:text-3xl xl:text-4xl">🪙</span>
                    <div className="text-left">
                      <div className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        金币
                      </div>
                      <div className="text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 dark:from-amber-400 dark:to-yellow-400 bg-clip-text text-transparent">
                        {debugMode ? '∞' : progress.coins.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 经验显示 */}
                <div className="group relative overflow-hidden rounded-4xl bg-gradient-to-br from-blue-50 to-indigo-50/80 px-6 py-3.5 text-center shadow-medium ring-1 ring-blue-200/50 dark:from-blue-900/20 dark:to-indigo-900/10 dark:ring-blue-700/30 backdrop-blur-sm hover-lift transition-smooth lg:px-7 lg:py-4 xl:px-8 xl:py-5">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-smooth"></div>
                  <div className="relative flex items-center gap-2 lg:gap-3">
                    <span className="text-2xl lg:text-3xl xl:text-4xl">⭐</span>
                    <div className="text-left">
                      <div className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        经验
                      </div>
                      <div className="text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                        {debugMode ? '∞' : progress.experience.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 调试模式标识 */}
                {debugMode && (
                  <div className="rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-5 py-2.5 text-xs lg:text-sm font-bold text-amber-700 shadow-soft dark:from-amber-900/30 dark:to-orange-900/30 dark:text-amber-400 hover-scale-sm transition-smooth">
                    🐛 调试模式
                  </div>
                )}
              </>
            ) : (
              /* 未登录状态 - 显示占位符 */
              <div className="rounded-4xl bg-gradient-to-br from-gray-50 to-gray-100/80 px-6 py-3.5 text-center shadow-medium ring-1 ring-gray-200/50 dark:from-gray-800/20 dark:to-gray-900/10 dark:ring-gray-700/30 backdrop-blur-sm lg:px-7 lg:py-4 xl:px-8 xl:py-5">
                <div className="flex items-center gap-2 lg:gap-3">
                  <span className="text-2xl lg:text-3xl xl:text-4xl">👤</span>
                  <div className="text-left">
                    <div className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      访客模式
                    </div>
                    <div className="text-sm lg:text-base font-medium text-gray-500 dark:text-gray-400">
                      登录后查看进度
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-7 xl:grid-cols-4 xl:gap-8 2xl:grid-cols-5 2xl:gap-9 3xl:grid-cols-6">
          {levels.map((level: LevelIndexEntry, index) => {
            // 未登录用户：所有关卡都显示为可浏览但不可游玩
            // 已登录用户：根据进度判断是否解锁
            const unlocked = user ? isLevelUnlocked(level.id) : false
            const snapshot = user ? progress.levelSnapshots[level.id] : null
            const completed = snapshot?.completed ?? false
            const lastPlayed = snapshot?.lastPlayedAt
            const difficulty = level.difficulty
            const difficultyConfig = DIFFICULTY_CONFIG[difficulty]
            const title = level.title || formatLevelTitle(level.id)
            const previousLevel = index > 0 ? levels[index - 1] : null
            const lockedMessage = !user
              ? '请登录后游玩'
              : previousLevel
              ? `需先完成${formatLevelTitle(previousLevel.id)}`
              : '尚未解锁'
            const rewardCoins = getRewardsForDifficulty(level.difficulty).coins

            // 点击处理：未登录跳转到登录页，已登录且解锁则进入关卡
            const handleClick = () => {
              if (!user) {
                navigate('/auth?mode=signin')
                return
              }
              if (!unlocked) return
              navigate(`/levels/${level.id}`)
            }

            return (
              <button
                key={level.id}
                type="button"
                onClick={handleClick}
                className={`card-enter card-enter-${(index % 6) + 1} group relative flex min-h-[180px] flex-col overflow-hidden rounded-4xl border border-slate-100/70 p-6 text-left shadow-medium transition-smooth md:min-h-[200px] md:p-7 lg:min-h-[220px] lg:p-8 xl:min-h-[240px] xl:p-9 dark:border-dark-border dark:shadow-dark-tile ${
                  !user || unlocked
                    ? 'bg-gradient-to-br from-surface/95 via-white/95 to-white text-slate-700 hover-lift hover:shadow-large focus:-translate-y-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 dark:from-dark-surface dark:via-dark-surface dark:to-dark-surface dark:text-dark-textSecondary backdrop-blur-sm'
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
                          !user || unlocked
                            ? formatDifficultyBadgeClasses(difficulty)
                            : 'bg-slate-300 text-slate-600 dark:bg-dark-surfaceSecondary dark:text-dark-textMuted'
                        }`}
                      >
                        难度·{difficultyConfig.label}
                      </span>
                      {user && completed && (
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
                    {!user ? '登录后游玩 →' : '进入关卡 →'}
                  </span>
                </div>
                {(!user || !unlocked) && (
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/60 backdrop-blur-sm dark:bg-dark-surface/80 dark:backdrop-blur-sm">
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
                      <div className="text-sm font-medium text-slate-600 dark:text-dark-textMuted">
                        {lockedMessage}
                      </div>
                      {!user && (
                        <div className="text-xs text-slate-500 dark:text-dark-textMuted">
                          点击登录以开始游玩
                        </div>
                      )}
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
