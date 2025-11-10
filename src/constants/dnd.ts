export const DND_ITEM_TYPES = {
  TILE: 'tile',
} as const

export type DnDItemType = (typeof DND_ITEM_TYPES)[keyof typeof DND_ITEM_TYPES]

