import { GoodLeaderboardGraph } from '@rctf/types'
import { hashKey } from '@tanstack/svelte-query'
import { queryKeys } from '$lib/query/keys'
import { beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('$app/environment', () => ({ browser: false }))

let graphResponse: unknown = null
mock.module('$lib/api', () => ({
  apiRequest: async () => graphResponse,
}))

let leaderboard!: typeof import('$lib/query/leaderboard')
let challenges!: typeof import('$lib/query/challenges')

beforeAll(async () => {
  leaderboard = await import('$lib/query/leaderboard')
  challenges = await import('$lib/query/challenges')
})

describe('getNextOffset (with-graph pagination contract)', () => {
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

describe('selfUserGraphQueryOptions (offset-hack graph)', () => {
  const goodGraph = (id: string) => ({
    kind: GoodLeaderboardGraph.kind,
    data: { graph: [{ id }] },
  })

  const runQueryFn = (
    globalPlace: number | null,
    userId: string | null,
    caching?: Parameters<typeof leaderboard.selfUserGraphQueryOptions>[2]
  ) => {
    const fn = leaderboard.selfUserGraphQueryOptions(
      globalPlace,
      userId,
      caching
    ).queryFn
    if (typeof fn !== 'function') {
      throw new Error('expected a callable queryFn')
    }
    return fn(undefined as never)
  }

  test('disabled when globalPlace is null', () => {
    expect(leaderboard.selfUserGraphQueryOptions(null, 'u1').enabled).toBe(
      false
    )
  })

  test('disabled when globalPlace is 0', () => {
    expect(leaderboard.selfUserGraphQueryOptions(0, 'u1').enabled).toBe(false)
  })

  test('enabled when globalPlace is a real rank', () => {
    expect(leaderboard.selfUserGraphQueryOptions(3, 'u1').enabled).toBe(true)
  })

  test('returns the entry when its id matches the user', async () => {
    graphResponse = goodGraph('u1')
    expect((await runQueryFn(3, 'u1'))?.id).toBe('u1')
  })

  test('returns null when the probed entry belongs to another team', async () => {
    graphResponse = goodGraph('other-team')
    expect(await runQueryFn(3, 'u1')).toBeNull()
  })

  test('returns null when the graph page is empty', async () => {
    graphResponse = { kind: GoodLeaderboardGraph.kind, data: { graph: [] } }
    expect(await runQueryFn(3, 'u1')).toBeNull()
  })

  test('returns the entry unconditionally when userId is null', async () => {
    graphResponse = goodGraph('whoever')
    expect((await runQueryFn(3, null))?.id).toBe('whoever')
  })

  test('default caching polls every 30s with no staleTime override', () => {
    const options = leaderboard.selfUserGraphQueryOptions(3, 'u1')
    expect(options.refetchInterval).toBe(30 * 1000)
    expect(options.staleTime).toBeUndefined()
  })

  test('public caching drops the poll and staggers a 5-minute staleTime', () => {
    const options = leaderboard.selfUserGraphQueryOptions(
      3,
      'u1',
      leaderboard.PUBLIC_GRAPH_CACHING
    )
    expect(options.refetchInterval).toBe(false)
    expect(options.staleTime).toBe(5 * 60 * 1000)
  })

  test('id-mismatch behavior is unchanged by the caching parameter', async () => {
    graphResponse = goodGraph('other-team')
    expect(
      await runQueryFn(3, 'u1', leaderboard.PUBLIC_GRAPH_CACHING)
    ).toBeNull()
  })
})
