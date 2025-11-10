export const HINT_COSTS = {
  group: 50,
  theme: 50,
  autoComplete: 75,
  verify: 75,
} as const

export const AUTO_COMPLETE_COOLDOWN_MS = 6_000
export const HINT_COST_INCREMENT = 10

export type HintCostKey = keyof typeof HINT_COSTS

export const getHintCost = (type: HintCostKey) => HINT_COSTS[type]

export const getHintCostForUsage = (type: HintCostKey, usageCount: number) =>
  getHintCost(type) + usageCount * HINT_COST_INCREMENT

export const getTotalHintCostForUsage = (type: HintCostKey, usageCount: number) => {
  if (usageCount <= 0) return 0
  const base = getHintCost(type)
  const increments = usageCount > 1 ? ((usageCount - 1) * usageCount) / 2 : 0
  return usageCount * base + increments * HINT_COST_INCREMENT
}

