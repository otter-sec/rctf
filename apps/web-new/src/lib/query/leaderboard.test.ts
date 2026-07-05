import { hashKey } from '@tanstack/svelte-query'
import { queryKeys } from '$lib/query/keys'
import { beforeAll, describe, expect, mock, test } from 'bun:test'

// leaderboard.ts imports $lib/api, which pulls in the SvelteKit virtual module
// $app/environment. bun test can't resolve that, so stub it before the modules
// are dynamically imported below.
mock.module('$app/environment', () => ({ browser: false }))

let leaderboard!: typeof import('./leaderboard')
let challenges!: typeof import('./challenges')

beforeAll(async () => {
  leaderboard = await import('./leaderboard')
  challenges = await import('./challenges')
})

describe('getNextOffset (with-graph pagination contract)', () => {
  // [lastOffset, lastPageCount, total, expected]
  const cases: [number, number, number, number | undefined][] = [
    [0, 100, 250, 100],
    [200, 50, 250, undefined],
    [200, 100, 250, undefined],
    [0, 0, 0, undefined],
    [0, 40, 40, undefined],
    [0, 40, 100, 40],
  ]
  test.each(cases)(
    'lastOffset=%i count=%i total=%i -> %p',
    (lastOffset, count, total, expected) => {
      expect(challenges.getNextOffset(lastOffset, count, total)).toBe(expected)
    }
  )
})

describe('mergeLeaderboardPages', () => {
  test('flat-maps pages preserving order and pairing leaderboard/graph', () => {
    const merged = leaderboard.mergeLeaderboardPages([
      {
        total: 4,
        leaderboard: [{ id: 'a' }, { id: 'b' }],
        graph: [{ id: 'a' }, { id: 'b' }],
      },
      {
        total: 4,
        leaderboard: [{ id: 'c' }, { id: 'd' }],
        graph: [{ id: 'c' }, { id: 'd' }],
      },
    ])
    expect(merged.leaderboard.map(entry => entry.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
    expect(merged.graph.map(series => series.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(merged.total).toBe(4)
  })

  test('reads total from the last page', () => {
    const merged = leaderboard.mergeLeaderboardPages([
      {
        total: 10,
        leaderboard: [{ id: 'a' }],
        graph: [{ id: 'a' }],
      },
      {
        total: 12,
        leaderboard: [{ id: 'b' }],
        graph: [{ id: 'b' }],
      },
    ])
    expect(merged.total).toBe(12)
  })

  test('returns empty arrays and total 0 for no pages', () => {
    const merged = leaderboard.mergeLeaderboardPages([])
    expect(merged.leaderboard).toEqual([])
    expect(merged.graph).toEqual([])
    expect(merged.total).toBe(0)
  })

  test('handles a single partial page', () => {
    const merged = leaderboard.mergeLeaderboardPages([
      {
        total: 3,
        leaderboard: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        graph: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      },
    ])
    expect(merged.leaderboard.map(entry => entry.id)).toEqual(['a', 'b', 'c'])
    expect(merged.total).toBe(3)
  })
})

describe('excludeSanityChallenges', () => {
  test('drops sanity-category challenges and preserves order of the rest', () => {
    const filtered = leaderboard.excludeSanityChallenges({
      c1: { category: 'web' },
      c2: { category: 'sanity' },
      c3: { category: 'pwn' },
    })
    expect(Object.keys(filtered)).toEqual(['c1', 'c3'])
  })

  test('matches sanity case-insensitively', () => {
    const filtered = leaderboard.excludeSanityChallenges({
      c1: { category: 'Sanity' },
      c2: { category: 'SANITY' },
      c3: { category: 'crypto' },
    })
    expect(Object.keys(filtered)).toEqual(['c3'])
  })

  test('keeps aliased non-sanity categories', () => {
    const filtered = leaderboard.excludeSanityChallenges({
      c1: { category: 'rev' },
      c2: { category: 'binary' },
    })
    expect(Object.keys(filtered)).toEqual(['c1', 'c2'])
  })
})

describe('leaderboardWithGraph query key', () => {
  test('distinct division/search combos produce distinct cache keys', () => {
    const keys = [
      queryKeys.leaderboardWithGraph({}),
      queryKeys.leaderboardWithGraph({ division: 'open' }),
      queryKeys.leaderboardWithGraph({ division: 'students' }),
      queryKeys.leaderboardWithGraph({ search: 'otter' }),
      queryKeys.leaderboardWithGraph({ division: 'open', search: 'otter' }),
    ].map(hashKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('undefined filters hash the same as an empty filter', () => {
    expect(
      hashKey(
        queryKeys.leaderboardWithGraph({
          division: undefined,
          search: undefined,
        })
      )
    ).toBe(hashKey(queryKeys.leaderboardWithGraph({})))
  })
})
