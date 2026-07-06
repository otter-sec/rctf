import { describe, expect, test } from 'bun:test'
import { computeRankDeltas, type RankDeltaEntry } from './rank-delta'

describe('computeRankDeltas — climbed / dropped / flat', () => {
  const entries: RankDeltaEntry[] = [
    { userId: 'a', points: 100, pointDelta: 40 },
    { userId: 'b', points: 90, pointDelta: -30 },
    { userId: 'c', points: 80, pointDelta: 0 },
  ]

  test.each([
    ['a', 2],
    ['b', -1],
    ['c', -1],
  ])('%p moved %p places', (userId, expected) => {
    expect(computeRankDeltas(entries).get(userId)).toBe(expected)
  })

  test('a team that keeps its rank has a flat (0) delta', () => {
    const flat: RankDeltaEntry[] = [
      { userId: 'x', points: 100, pointDelta: 10 },
      { userId: 'y', points: 80, pointDelta: 10 },
    ]
    const deltas = computeRankDeltas(flat)
    expect(deltas.get('x')).toBe(0)
    expect(deltas.get('y')).toBe(0)
  })
})

describe('computeRankDeltas — ties preserve current order', () => {
  const entries: RankDeltaEntry[] = [
    { userId: 'p', points: 100, pointDelta: 50 },
    { userId: 'q', points: 90, pointDelta: 40 },
    { userId: 'r', points: 80, pointDelta: -30 },
  ]

  test.each([
    ['p', 1],
    ['q', 1],
    ['r', -2],
  ])('%p moved %p places', (userId, expected) => {
    expect(computeRankDeltas(entries).get(userId)).toBe(expected)
  })
})

describe('computeRankDeltas — degenerate inputs', () => {
  test('a single entry never moves', () => {
    const deltas = computeRankDeltas([
      { userId: 'solo', points: 100, pointDelta: 20 },
    ])
    expect(deltas.size).toBe(1)
    expect(deltas.get('solo')).toBe(0)
  })

  test('no entries yields an empty map', () => {
    expect(computeRankDeltas([]).size).toBe(0)
  })

  test('all entries sharing a previous score keep their current order', () => {
    const entries: RankDeltaEntry[] = [
      { userId: 'a', points: 100, pointDelta: 0 },
      { userId: 'b', points: 120, pointDelta: 20 },
      { userId: 'c', points: 90, pointDelta: -10 },
    ]
    const deltas = computeRankDeltas(entries)
    expect(deltas.get('a')).toBe(0)
    expect(deltas.get('b')).toBe(0)
    expect(deltas.get('c')).toBe(0)
  })
})

describe('computeRankDeltas — loaded-pages-only caveat (M5)', () => {
  test('a subset is re-ranked among itself only', () => {
    const subset: RankDeltaEntry[] = [
      { userId: 'b', points: 90, pointDelta: 40 },
      { userId: 'c', points: 80, pointDelta: -30 },
    ]
    const deltas = computeRankDeltas(subset)
    expect(deltas.get('b')).toBe(1)
    expect(deltas.get('c')).toBe(-1)
  })
})
