import type { GroupDefinition, LevelFile, TileDefinition } from '../types/levels'

export type TileStatus = 'available' | 'locked' | 'completed'

export interface TileInstance {
  instanceId: string
  tileId: string
  groupId: string
  data: TileDefinition
  status: TileStatus
}

export interface CompletedGroup {
  group: GroupDefinition
  tiles: TileInstance[]
  completedAt: string
}

export interface MatchResult {
  groupId: string
  rowIndex: number
  tileIds: string[]
}

const makeInstanceId = (groupId: string, tileId: string, index: number) =>
  `${groupId}::${tileId ?? index}::${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`

const fisherShuffle = <T,>(list: T[], rng: () => number = Math.random): T[] => {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const createTileInstances = (level: LevelFile, shuffle = true): TileInstance[] => {
  const instances = level.groups.flatMap((group) =>
    group.tiles.map((tile, index) => ({
      instanceId: makeInstanceId(group.id, tile.id, index),
      tileId: tile.id,
      groupId: group.id,
      data: tile,
      status: 'available' as TileStatus,
    })),
  )

  return shuffle ? fisherShuffle(instances) : instances
}

export const reorderTiles = (
  tiles: TileInstance[],
  fromIndex: number,
  toIndex: number,
): TileInstance[] => {
  const next = [...tiles]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export const swapTiles = (
  tiles: TileInstance[],
  fromIndex: number,
  toIndex: number,
): TileInstance[] => {
  if (fromIndex === toIndex) return tiles
  const next = [...tiles]
  const temp = next[fromIndex]
  next[fromIndex] = next[toIndex]
  next[toIndex] = temp
  return next
}

export const findMatches = (
  tiles: TileInstance[],
  columns: number,
  completedGroupIds: Set<string>,
): MatchResult[] => {
  const matches: MatchResult[] = []
  const rowCount = Math.floor(tiles.length / columns)

  for (let row = 0; row < rowCount; row += 1) {
    const rowStart = row * columns
    const rowTiles = tiles.slice(rowStart, rowStart + columns)
    if (rowTiles.length < columns) continue
    const groupId = rowTiles[0]?.groupId
    if (!groupId) continue
    const allSameGroup = rowTiles.every(
      (tile) => tile.groupId === groupId && tile.status === 'available',
    )
    if (allSameGroup && !completedGroupIds.has(groupId)) {
      matches.push({
        groupId,
        rowIndex: row,
        tileIds: rowTiles.map((tile) => tile.instanceId),
      })
    }
  }

  return matches
}

export const removeTilesById = (tiles: TileInstance[], ids: Set<string>): TileInstance[] =>
  tiles.filter((tile) => !ids.has(tile.instanceId))

export const groupLookup = (groups: GroupDefinition[]): Record<string, GroupDefinition> =>
  groups.reduce<Record<string, GroupDefinition>>((acc, group) => {
    acc[group.id] = group
    return acc
  }, {})

export const buildCompletedGroup = (
  group: GroupDefinition,
  tiles: TileInstance[],
  matched: MatchResult,
): CompletedGroup => ({
  group,
  tiles: tiles.filter((tile) => matched.tileIds.includes(tile.instanceId)),
  completedAt: new Date().toISOString(),
})

