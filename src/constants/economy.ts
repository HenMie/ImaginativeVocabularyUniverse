export const HINT_COSTS = {
  group: 25,
  theme: 40,
  autoComplete: 80,
  verify: 10,
} as const

export const AUTO_COMPLETE_COOLDOWN_MS = 6_000

export type HintCostKey = keyof typeof HINT_COSTS

export const getHintCost = (type: HintCostKey) => HINT_COSTS[type]

