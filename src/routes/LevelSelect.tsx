import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImportExportModal } from '../components/ImportExportModal'
import { fetchLevelIndex } from '../services/levelService'
import type { LevelIndexEntry } from '../types/levels'
import { useProgressStore } from '../store/progressStore'
import {
  DIFFICULTY_CONFIG,
  formatDifficultyBadgeClasses,
  formatLevelTitle,
} from '../constants/levels'

export const LevelSelect = () => {
  const navigate = useNavigate()
  const progress = useProgressStore((state) => state.progress)
  const [levels, setLevels] = useState<LevelIndexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBackup, setShowBackup] = useState(false)

  useEffect(() => {
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
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-3xl font-semibold text-primary">脑洞词场</h1>
        <p className="text-sm text-slate-600">正在加载关卡……</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-semibold text-primary">脑洞词场</h1>
        <p className="max-w-md text-sm text-red-500">加载关卡列表失败：{error}</p>
      </main>
    )
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface/80 p-6 shadow-tile backdrop-blur">
          <div>
            <h1 className="text-3xl font-semibold text-primary">脑洞词场</h1>
            <p className="text-sm text-slate-600">拖动词块，为外语学习分组</p>
          </div>
          <div className="flex gap-4 text-right text-sm text-slate-500">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">星星</div>
              <div className="text-lg font-semibold text-slate-700">{progress.totalStars}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">金币</div>
              <div className="text-lg font-semibold text-slate-700">{progress.coins}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBackup(true)}
            className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/20"
          >
            导入 / 导出
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {levels.map((level: LevelIndexEntry) => {
            const unlocked =
              progress.unlockedLevelIds.includes(level.id) ||
              progress.totalStars >= level.requiredStars
            const snapshot = progress.levelSnapshots[level.id]
            const completed = (snapshot?.starsEarned ?? 0) >= level.rewards.stars
            const lastPlayed = snapshot?.lastPlayedAt
            const difficulty = level.difficulty
            const difficultyConfig = DIFFICULTY_CONFIG[difficulty]
            const title = formatLevelTitle(level.id)
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => {
                  if (!unlocked) return
                  navigate(`/levels/${level.id}`)
                }}
                disabled={!unlocked}
                className={`relative flex min-h-[160px] flex-col rounded-3xl p-5 text-left shadow-tile transition ${
                  unlocked
                    ? 'bg-surface/90 text-slate-700 hover:-translate-y-1 focus:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary/40'
                    : 'cursor-not-allowed bg-slate-200/70 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      解锁需求：{level.requiredStars}★
                    </div>
                    <h2 className="mt-2 text-xl font-semibold">{title}</h2>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full px-3 py-[2px] text-[11px] font-semibold ${formatDifficultyBadgeClasses(difficulty)}`}
                    >
                      难度：{difficultyConfig.label}
                    </span>
                  </div>
                  {completed && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-600">
                      已完成
                    </span>
                  )}
                </div>
                <div className="mt-auto space-y-2 pt-4 text-sm font-medium">
                  <div>
                    奖励：{level.rewards.coins} 金币 · {level.rewards.stars}★
                  </div>
                  {snapshot ? (
                    <div className="text-xs font-medium text-slate-500">
                      星级：{snapshot.starsEarned}/{level.rewards.stars}★ · 最近游玩：
                      {lastPlayed ? new Date(lastPlayed).toLocaleDateString() : '—'}
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-400">尚未游玩</div>
                  )}
                  <span className="inline-block text-primary">进入</span>
                </div>
                {!unlocked && (
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/60 backdrop-blur-sm">
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      需累计 {level.requiredStars}★ 解锁
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </section>
      </main>
      <ImportExportModal open={showBackup} onClose={() => setShowBackup(false)} />
    </>
  )
}

