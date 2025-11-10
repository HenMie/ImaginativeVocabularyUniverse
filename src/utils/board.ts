import type {
  GroupDefinition,
  LevelFile,
  TileDefinition,
} from '../types/levels'

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

/**
 * 智能选择初始卡片：优先选择完整的主题组（4张一组）
 * @param level 关卡数据
 * @param maxVisible 最大可见卡片数（通常是 columns * rows）
 * @returns { visible: 可见的卡片, reserve: 储备的卡片 }
 */
export const createSmartInitialTiles = (
  level: LevelFile,
  maxVisible: number,
): { visible: TileInstance[]; reserve: TileInstance[] } => {
  // 创建所有卡片实例
  const allInstances = level.groups.map((group) => ({
    groupId: group.id,
    tiles: group.tiles.map((tile, index) => ({
      instanceId: makeInstanceId(group.id, tile.id, index),
      tileId: tile.id,
      groupId: group.id,
      data: tile,
      status: 'available' as TileStatus,
    })),
  }))

  // 随机打乱主题组的顺序
  const shuffledGroups = fisherShuffle(allInstances)

  const visibleTiles: TileInstance[] = []
  const reserveTiles: TileInstance[] = []

  // 第一轮：优先选择完整的主题组（整组4张卡片）
  for (const group of shuffledGroups) {
    if (visibleTiles.length + group.tiles.length <= maxVisible) {
      visibleTiles.push(...group.tiles)
    } else {
      reserveTiles.push(...group.tiles)
    }
  }

  // 第二轮：如果还有空位，从储备中随机抽取卡片补充
  if (visibleTiles.length < maxVisible && reserveTiles.length > 0) {
    const needed = maxVisible - visibleTiles.length
    const shuffledReserve = fisherShuffle(reserveTiles)
    const supplement = shuffledReserve.slice(0, needed)
    const remaining = shuffledReserve.slice(needed)
    visibleTiles.push(...supplement)
    // 更新储备区为剩余的卡片
    reserveTiles.length = 0
    reserveTiles.push(...remaining)
  }

  // 最终打乱可见卡片的顺序（让玩家看不出规律）
  return {
    visible: fisherShuffle(visibleTiles),
    reserve: reserveTiles,
  }
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

