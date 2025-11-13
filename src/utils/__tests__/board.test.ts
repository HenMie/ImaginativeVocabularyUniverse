import { describe, expect, it } from 'vitest'
import type { LevelFile } from '../../types/levels'
import {
  createTileInstances,
  findMatches,
  groupLookup,
  removeTilesById,
  reorderTiles,
} from '../board'

const groups = [
  {
    id: 'alpha',
    category: { en: 'alpha' },
    tiles: [
      { id: 'a1', text: { en: 'one' } },
      { id: 'a2', text: { en: 'two' } },
      { id: 'a3', text: { en: 'three' } },
      { id: 'a4', text: { en: 'four' } },
    ],
  },
  {
    id: 'beta',
    category: { en: 'beta' },
    tiles: [
      { id: 'b1', text: { en: 'five' } },
      { id: 'b2', text: { en: 'six' } },
      { id: 'b3', text: { en: 'seven' } },
      { id: 'b4', text: { en: 'eight' } },
    ],
  },
]

const sampleLevel: LevelFile = {
  id: 'test',
  difficulty: 'easy',
  version: 1,
  language: ['en'],
  isPublished: true,
  updatedAt: new Date().toISOString(),
  content: {
    groups,
  },
  groups,
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
    expect(map.alpha.category).toEqual({ en: 'alpha' })
  })
})
