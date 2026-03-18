import { describe, expect, mock, test } from 'bun:test'
import {
  cacheLeaderboardAndGraph,
  getGraphForEntries,
  type CalculatedLeaderboard,
} from '../../../../apps/api/src/cache/leaderboard'
import type { TypedRedis } from '../../../../apps/api/src/cache/scripts'

const createMockRedis = () => {
  const store = new Map<string, string>()
  const hashStore = new Map<string, Map<string, string>>()

  return {
    store,
    hashStore,
    get: mock(async (key: string) => store.get(key) ?? null),
    set: mock(async (key: string, value: string) => {
      store.set(key, value)
      return 'OK'
    }),
    hmget: mock(async (key: string, ...fields: string[]) => {
      const hash = hashStore.get(key)
      return fields.map(f => hash?.get(f) ?? null)
    }),
    hget: mock(async (key: string, field: string) => {
      const hash = hashStore.get(key)
      return hash?.get(field) ?? null
    }),
    rctfSetGraph: mock(async (..._args: string[]) => {}),
    rctfRateLimit: mock(
      async (_key: string, _limit: string, _ttlMs: string) => 0
    ),
  } as unknown as TypedRedis & {
    store: Map<string, string>
    hashStore: Map<string, Map<string, string>>
  }
}

const createMockDb = () => {
  const executedQueries: any[] = []
  const txMock = {
    execute: mock(async (query: any) => {
      executedQueries.push(query)
      return []
    }),
    update: mock((_table: any) => ({
      set: mock((_values: any) => ({
        where: mock(async (_condition: any) => {
          executedQueries.push({ type: 'update' })
          return []
        }),
      })),
    })),
  }

  return {
    executedQueries,
    transaction: mock(async (fn: (tx: any) => Promise<void>) => {
      await fn(txMock)
    }),
  } as any
}

describe('leaderboard cache', () => {
  describe('getGraphForEntries', () => {
    test('returns graph entries for the provided users and preserves order', async () => {
      const redis = createMockRedis()
      redis.store.set('graph-update', '1700000000')
      redis.hashStore.set(
        'graph-data',
        new Map([
          ['user2', '1699990000,40'],
          ['user1', '1699995000,80'],
        ])
      )

      const result = await getGraphForEntries(redis, [
        { id: 'user2', name: 'User Two', score: 60 },
        { id: 'user1', name: 'User One', score: 100 },
      ])

      expect(result.map(entry => entry.id)).toEqual(['user2', 'user1'])
      expect(result[0]!.points[0]).toEqual({ time: 1700000000, score: 60 })
      expect(result[1]!.points[0]).toEqual({ time: 1700000000, score: 100 })
      expect(redis.hmget).toHaveBeenCalledWith('graph-data', 'user2', 'user1')
    })

    test('returns empty array when no entries', async () => {
      const redis = createMockRedis()
      const result = await getGraphForEntries(redis, [])
      expect(result).toEqual([])
    })

    test('handles missing graph data', async () => {
      const redis = createMockRedis()
      redis.store.set('graph-update', '1700000000')
      redis.hashStore.set('graph-data', new Map())

      const result = await getGraphForEntries(redis, [
        { id: 'user1', name: 'User One', score: 100 },
      ])

      expect(result).toHaveLength(1)
      expect(result[0]!.points).toHaveLength(1)
      expect(result[0]!.points[0]).toEqual({ time: 1700000000, score: 100 })
    })

    test('handles lastUpdate of 0', async () => {
      const redis = createMockRedis()
      redis.store.set('graph-update', '0')
      redis.hashStore.set('graph-data', new Map([['user1', '1699990000,50']]))

      const result = await getGraphForEntries(redis, [
        { id: 'user1', name: 'User One', score: 100 },
      ])

      expect(result).toHaveLength(1)
      expect(result[0]!.points).toHaveLength(1)
      expect(result[0]!.points[0]).toEqual({ time: 1699990000, score: 50 })
    })

    test('sorts points by time descending', async () => {
      const redis = createMockRedis()
      redis.store.set('graph-update', '1700000000')
      redis.hashStore.set(
        'graph-data',
        new Map([['user1', '1699980000,20,1699990000,50']])
      )

      const result = await getGraphForEntries(redis, [
        { id: 'user1', name: 'User One', score: 100 },
      ])

      expect(result[0]!.points[0]!.time).toBe(1700000000) // most recent first
      expect(result[0]!.points[1]!.time).toBe(1699990000)
      expect(result[0]!.points[2]!.time).toBe(1699980000)
    })
  })

  describe('cacheLeaderboardAndGraph', () => {
    test('caches graph data when samples exist', async () => {
      const redis = createMockRedis()
      const db = createMockDb()
      const data: CalculatedLeaderboard = {
        users: [
          {
            id: 'user1',
            name: 'User One',
            division: 'open',
            score: 100,
            hadAnySolve: true,
            lastSolve: 1699995000,
            lastTiebreakEligibleSolve: 1699995000,
          },
        ],
        challengeInfos: new Map(),

        samples: [
          {
            time: 1699990000,
            userScores: [{ id: 'user1', score: 50 }],
          },
          {
            time: 1699995000,
            userScores: [{ id: 'user1', score: 100 }],
          },
        ],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.rctfSetGraph).toHaveBeenCalled()
      expect(db.transaction).toHaveBeenCalled()
    })

    test('does not cache graph when no samples', async () => {
      const redis = createMockRedis()
      const db = createMockDb()
      const data: CalculatedLeaderboard = {
        users: [
          {
            id: 'user1',
            name: 'User One',
            division: 'open',
            score: 100,
            hadAnySolve: true,
            lastSolve: 1699995000,
            lastTiebreakEligibleSolve: undefined,
          },
        ],
        challengeInfos: new Map(),

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.rctfSetGraph).not.toHaveBeenCalled()
      expect(db.transaction).toHaveBeenCalled()
    })

    test('handles empty users list', async () => {
      const redis = createMockRedis()
      const db = createMockDb()
      const data: CalculatedLeaderboard = {
        users: [],
        challengeInfos: new Map(),

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(db.transaction).toHaveBeenCalled()
    })

    test('aggregates graph points per user across samples', async () => {
      const redis = createMockRedis()
      const db = createMockDb()
      const data: CalculatedLeaderboard = {
        users: [],
        challengeInfos: new Map(),

        samples: [
          {
            time: 1699990000,
            userScores: [
              { id: 'user1', score: 30 },
              { id: 'user2', score: 20 },
            ],
          },
          {
            time: 1699995000,
            userScores: [
              { id: 'user1', score: 70 },
              { id: 'user2', score: 50 },
            ],
          },
        ],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.rctfSetGraph).toHaveBeenCalled()
    })
  })
})
