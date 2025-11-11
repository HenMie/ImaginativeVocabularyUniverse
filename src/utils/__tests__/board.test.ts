import { describe, expect, it } from 'vitest'
import type { LevelFile } from '../../types/levels'
import {
  createTileInstances,
  findMatches,
  groupLookup,
  removeTilesById,
  reorderTiles,
} from '../board'

const sampleLevel: LevelFile = {
  id: 'test',
  difficulty: 'easy',
  version: 2,
  language: ['ko', 'zh'],
  groups: [
    {
      id: 'alpha',
      category: { ko: '알파', zh: '阿尔法' },
      tiles: [
        { id: 'a1', text: { ko: '가', zh: '甲' } },
        { id: 'a2', text: { ko: '나', zh: '乙' } },
        { id: 'a3', text: { ko: '다', zh: '丙' } },
        { id: 'a4', text: { ko: '라', zh: '丁' } },
      ],
    },
    {
      id: 'beta',
      category: { ko: '베타', zh: '贝塔' },
      tiles: [
        { id: 'b1', text: { ko: '마', zh: '戊' } },
        { id: 'b2', text: { ko: '바', zh: '己' } },
        { id: 'b3', text: { ko: '사', zh: '庚' } },
        { id: 'b4', text: { ko: '아', zh: '辛' } },
      ],
    },
  ],
}

describe('board utilities', () => {
  it('creates tile instances with unique ids', () => {
    const tiles = createTileInstances(sampleLevel, false)
    expect(tiles).toHaveLength(8)
    const unique = new Set(tiles.map((tile) => tile.instanceId))
    expect(unique.size).toBe(tiles.length)
  })

  it('reorders tiles and detects completed rows', () => {
    const tiles = createTileInstances(sampleLevel, false)
    let reordered = reorderTiles(tiles, 4, 0)
    reordered = reorderTiles(reordered, 5, 1)
    reordered = reorderTiles(reordered, 6, 2)
    reordered = reorderTiles(reordered, 7, 3)
    expect(reordered.slice(0, 4).every((tile) => tile.groupId === 'beta')).toBe(true)

    const matches = findMatches(reordered, 4, new Set())
    expect(matches).toHaveLength(2)
    expect(matches[0]?.groupId).toBe('beta')
    expect(matches[1]?.groupId).toBe('alpha')

    const updated = removeTilesById(reordered, new Set(matches[0]?.tileIds ?? []))
    expect(updated).toHaveLength(4)
    expect(updated.every((tile) => tile.groupId === 'alpha')).toBe(true)
  })

  it('builds group lookup', () => {
    const map = groupLookup(sampleLevel.groups)
    expect(map.alpha.category).toEqual({ ko: '알파', zh: '阿尔法' })
  })
})
