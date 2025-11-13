import type { Difficulty } from '../types/levels'

interface DifficultyConfig {
  label: string
  coins: number
  badgeClass: string
  badgeTextClass: string
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: '入门',
    coins: 40,
    badgeClass: 'bg-emerald-100',
    badgeTextClass: 'text-emerald-700',
  },
  medium: {
    label: '进阶',
    coins: 60,
    badgeClass: 'bg-amber-100',
    badgeTextClass: 'text-amber-700',
  },
  hard: {
    label: '挑战',
    coins: 80,
    badgeClass: 'bg-rose-100',
    badgeTextClass: 'text-rose-700',
  },
  expert: {
    label: '大师',
    coins: 100,
    badgeClass: 'bg-indigo-100',
    badgeTextClass: 'text-indigo-700',
  },
}

export const getRewardsForDifficulty = (difficulty: Difficulty) => {
  const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.easy
  return { coins: config.coins }
}

export const formatDifficultyBadgeClasses = (difficulty: Difficulty) => {
  const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.easy
  return `${config.badgeClass} ${config.badgeTextClass}`
}

export const deriveLevelSequence = (levelId: string) => {
  const numeric = Number(levelId.replace(/\D/g, ''))
  return Number.isNaN(numeric) || numeric <= 0 ? null : numeric
}

export const formatLevelTitle = (levelId: string) => {
  const seq = deriveLevelSequence(levelId)
  return seq ? `关卡${seq}` : '关卡'
}
