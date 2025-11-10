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
  name: 'Test Level',
  difficulty: 'easy',
  version: 1,
  languageCodes: ['ko', 'zh'],
  groups: [
    {
      id: 'alpha',
      category: 'Alpha',
      tiles: [
        { id: 'a1', languageCode: 'ko', text: '가', translations: { zh: '甲' } },
        { id: 'a2', languageCode: 'ko', text: '나', translations: { zh: '乙' } },
        { id: 'a3', languageCode: 'ko', text: '다', translations: { zh: '丙' } },
        { id: 'a4', languageCode: 'ko', text: '라', translations: { zh: '丁' } },
      ],
    },
    {
      id: 'beta',
      category: 'Beta',
      tiles: [
        { id: 'b1', languageCode: 'ko', text: '마', translations: { zh: '戊' } },
        { id: 'b2', languageCode: 'ko', text: '바', translations: { zh: '己' } },
        { id: 'b3', languageCode: 'ko', text: '사', translations: { zh: '庚' } },
        { id: 'b4', languageCode: 'ko', text: '아', translations: { zh: '辛' } },
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
    expect(map.alpha.category).toBe('Alpha')
  })
})

