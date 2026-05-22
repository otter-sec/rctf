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
    hset: mock(async (key: string, ...args: string[]) => {
      let hash = hashStore.get(key)
      if (!hash) {
        hash = new Map()
        hashStore.set(key, hash)
      }
      for (let i = 0; i < args.length; i += 2) {
        hash.set(args[i]!, args[i + 1]!)
      }
      return args.length / 2
    }),
    rctfSetGraph: mock(
      async (
        updateKey: string,
        dataKey: string,
        lastSample: string,
        ...args: string[]
      ) => {
        store.set(updateKey, lastSample)
        hashStore.delete(dataKey)
        if (args.length === 0) {
          return
        }

        const hash = new Map<string, string>()
        for (let i = 0; i < args.length; i += 2) {
          hash.set(args[i]!, args[i + 1]!)
        }
        hashStore.set(dataKey, hash)
      }
    ),
    rctfRateLimit: mock(
      async (_key: string, _limit: string, _ttlMs: string) => 0
    ),
  } as unknown as TypedRedis & {
    store: Map<string, string>
    hashStore: Map<string, Map<string, string>>
  }
}

const createMockDb = (
  scoreEventRows:
    | Array<{
        id: string
        userid: string | null
        pointsDelta: number
        eventAt: string
      }>
    | Array<
        Array<{
          id: string
          userid: string | null
          pointsDelta: number
          eventAt: string
        }>
      > = []
) => {
  const scoreEventQueue = Array.isArray(scoreEventRows[0])
    ? [
        ...(scoreEventRows as Array<
          Array<{
            id: string
            userid: string | null
            pointsDelta: number
            eventAt: string
          }>
        >),
      ]
    : null
  const getScoreEventRows = () =>
    scoreEventQueue
      ? (scoreEventQueue.shift() ?? [])
      : (scoreEventRows as Array<{
          id: string
          userid: string | null
          pointsDelta: number
          eventAt: string
        }>)
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
    select: mock((_selection: any) => ({
      from: mock((_table: any) => ({
        where: mock((_condition: any) => ({
          orderBy: mock(async (..._order: any[]) => getScoreEventRows()),
        })),
      })),
    })),
    transaction: mock(async (fn: (tx: any) => Promise<void>) => {
      await fn(txMock)
    }),
  } as any
}

describe('leaderboard cache', () => {
  const challengeInfos: CalculatedLeaderboard['challengeInfos'] = new Map([
    [
      'challenge1',
      {
        score: 100,
        solves: 1,
        name: 'Challenge One',
        category: 'misc',
        sortWeight: null,
      },
    ],
  ])

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
    test('caches graph data from score events', async () => {
      const redis = createMockRedis()
      const db = createMockDb([
        {
          id: 'evt1',
          userid: 'user1',
          pointsDelta: 50,
          eventAt: new Date(1699990000).toISOString(),
        },
        {
          id: 'evt2',
          userid: 'user1',
          pointsDelta: 50,
          eventAt: new Date(1699995000).toISOString(),
        },
      ])
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
        challengeInfos,

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.rctfSetGraph).toHaveBeenCalled()
      expect(redis.rctfSetGraph).toHaveBeenCalledWith(
        'graph-update',
        'graph-data',
        expect.any(String),
        'user1',
        '1699990000,50,1699995000,100'
      )
      expect(db.transaction).toHaveBeenCalled()
    })

    test('clears cached graph when no score events exist', async () => {
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
        challengeInfos,

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.rctfSetGraph).toHaveBeenCalledWith(
        'graph-update',
        'graph-data',
        expect.any(String)
      )
      expect(db.transaction).toHaveBeenCalled()
    })

    test('falls back to sample graph when score events are not backfilled', async () => {
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
        challengeInfos,

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

      expect(redis.rctfSetGraph).toHaveBeenCalledWith(
        'graph-update',
        'graph-data',
        '1699995000',
        'user1',
        '1699990000,50,1699995000,100'
      )
      expect(redis.store.get('graph-source')).toBe('samples')
    })

    test('switches from sample fallback once score events appear', async () => {
      const redis = createMockRedis()
      const db = createMockDb([
        [],
        [
          {
            id: 'evt1',
            userid: 'user1',
            pointsDelta: 25,
            eventAt: new Date(1699995000).toISOString(),
          },
        ],
      ])
      const data: CalculatedLeaderboard = {
        users: [
          {
            id: 'user1',
            name: 'User One',
            division: 'open',
            score: 75,
            hadAnySolve: true,
            lastSolve: 1699995000,
            lastTiebreakEligibleSolve: undefined,
          },
        ],
        challengeInfos,

        samples: [
          {
            time: 1699990000,
            userScores: [{ id: 'user1', score: 50 }],
          },
          {
            time: 1699995000,
            userScores: [{ id: 'user1', score: 75 }],
          },
        ],
      }

      await cacheLeaderboardAndGraph(db, redis, data)
      expect(redis.store.get('graph-source')).toBe('samples')

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.store.get('graph-source')).toBe('events')
      expect(redis.rctfSetGraph).toHaveBeenLastCalledWith(
        'graph-update',
        'graph-data',
        expect.any(String),
        'user1',
        '1699990000,50,1699995000,75'
      )
    })

    test('handles empty users list', async () => {
      const redis = createMockRedis()
      const db = createMockDb()
      const data: CalculatedLeaderboard = {
        users: [],
        challengeInfos,

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(db.transaction).toHaveBeenCalled()
    })

    test('aggregates graph points per user across score events', async () => {
      const redis = createMockRedis()
      const db = createMockDb([
        {
          id: 'evt1',
          userid: 'user1',
          pointsDelta: 30,
          eventAt: new Date(1699990000).toISOString(),
        },
        {
          id: 'evt2',
          userid: 'user2',
          pointsDelta: 20,
          eventAt: new Date(1699990000).toISOString(),
        },
        {
          id: 'evt3',
          userid: 'user1',
          pointsDelta: 40,
          eventAt: new Date(1699995000).toISOString(),
        },
        {
          id: 'evt4',
          userid: 'user2',
          pointsDelta: 30,
          eventAt: new Date(1699995000).toISOString(),
        },
      ])
      const data: CalculatedLeaderboard = {
        users: [
          {
            id: 'user1',
            name: 'User One',
            division: 'open',
            score: 70,
            hadAnySolve: true,
            lastSolve: 1699995000,
            lastTiebreakEligibleSolve: undefined,
          },
          {
            id: 'user2',
            name: 'User Two',
            division: 'open',
            score: 50,
            hadAnySolve: true,
            lastSolve: 1699995000,
            lastTiebreakEligibleSolve: undefined,
          },
        ],
        challengeInfos,

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.rctfSetGraph).toHaveBeenCalledWith(
        'graph-update',
        'graph-data',
        expect.any(String),
        'user1',
        '1699990000,30,1699995000,70',
        'user2',
        '1699990000,20,1699995000,50'
      )
    })

    test('rebuilds graph from all score events on each cache write', async () => {
      const redis = createMockRedis()
      const db = createMockDb([
        [
          {
            id: 'evt1',
            userid: 'user1',
            pointsDelta: 50,
            eventAt: new Date(1699990000).toISOString(),
          },
        ],
        [
          {
            id: 'evt1',
            userid: 'user1',
            pointsDelta: 50,
            eventAt: new Date(1699990000).toISOString(),
          },
          {
            id: 'evt2',
            userid: 'user1',
            pointsDelta: 25,
            eventAt: new Date(1699995000).toISOString(),
          },
        ],
      ])
      const data: CalculatedLeaderboard = {
        users: [
          {
            id: 'user1',
            name: 'User One',
            division: 'open',
            score: 75,
            hadAnySolve: true,
            lastSolve: 1699995000,
            lastTiebreakEligibleSolve: undefined,
          },
        ],
        challengeInfos,

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)
      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.rctfSetGraph).toHaveBeenCalledTimes(2)
      expect(redis.rctfSetGraph).toHaveBeenLastCalledWith(
        'graph-update',
        'graph-data',
        expect.any(String),
        'user1',
        '1699990000,50,1699995000,75'
      )
    })
  })
})
