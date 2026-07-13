import { config } from '@rctf/config'
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
    hmget: mock(async (key: string, fields: string[]) => {
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
    rctfMergeGraph: mock(
      async (
        updateKey: string,
        dataKey: string,
        fingerprintKey: string,
        cursorKey: string,
        sourceKey: string,
        lastSample: string,
        fingerprint: string,
        cursor: string,
        source: string,
        packedUpdates: string[]
      ) => {
        let hash = hashStore.get(dataKey)
        if (!hash) {
          hash = new Map()
          hashStore.set(dataKey, hash)
        }
        for (let i = 0; i < packedUpdates.length; i += 2) {
          hash.set(packedUpdates[i]!, packedUpdates[i + 1]!)
        }
        store.set(updateKey, lastSample)
        store.set(fingerprintKey, fingerprint)
        store.set(cursorKey, cursor)
        store.set(sourceKey, source)
      }
    ),
    rctfReplaceGraph: mock(
      async (
        updateKey: string,
        dataKey: string,
        fingerprintKey: string,
        cursorKey: string,
        sourceKey: string,
        lastSample: string,
        fingerprint: string,
        cursor: string,
        source: string,
        packedUpdates: string[]
      ) => {
        hashStore.delete(dataKey)
        if (packedUpdates.length > 0) {
          const hash = new Map<string, string>()
          for (let i = 0; i < packedUpdates.length; i += 2) {
            hash.set(packedUpdates[i]!, packedUpdates[i + 1]!)
          }
          hashStore.set(dataKey, hash)
        }
        store.set(updateKey, lastSample)
        store.set(fingerprintKey, fingerprint)
        store.set(cursorKey, cursor)
        store.set(sourceKey, source)
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

type MockScoreEventRow = {
  id: string
  userid: string | null
  pointsDelta: number
  eventAt: string
}

const createMockDb = (
  scoreEventRows:
    | Array<MockScoreEventRow>
    | Array<Array<MockScoreEventRow>> = []
) => {
  const scoreEventQueue = Array.isArray(scoreEventRows[0])
    ? [...(scoreEventRows as Array<Array<MockScoreEventRow>>)]
    : null
  const getScoreEventRows = () =>
    scoreEventQueue
      ? (scoreEventQueue.shift() ?? [])
      : (scoreEventRows as Array<MockScoreEventRow>)
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
    select: mock((_selection: any) => {
      const whereNode = mock((_condition: any) => ({
        orderBy: mock(async (..._order: any[]) => getScoreEventRows()),
        // oxlint-disable-next-line unicorn/no-thenable -- this Drizzle query mock must remain promise-like
        then: (resolve: (rows: never[]) => unknown) =>
          Promise.resolve(resolve([])),
      }))
      return {
        from: mock((_table: any) => ({
          innerJoin: mock((..._join: any[]) => ({ where: whereNode })),
          where: whereNode,
        })),
      }
    }),
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

      const result = await getGraphForEntries(createMockDb(), redis, [
        { id: 'user2', name: 'User Two', score: 60 },
        { id: 'user1', name: 'User One', score: 100 },
      ])

      expect(result.map(entry => entry.id)).toEqual(['user2', 'user1'])
      expect(result[0]!.points[0]).toEqual({ time: 1700000000, score: 60 })
      expect(result[1]!.points[0]).toEqual({ time: 1700000000, score: 100 })
      expect(redis.hmget).toHaveBeenCalledWith('graph-data', ['user2', 'user1'])
    })

    test('returns empty array when no entries', async () => {
      const redis = createMockRedis()
      const result = await getGraphForEntries(createMockDb(), redis, [])
      expect(result).toEqual([])
    })

    test('handles missing graph data', async () => {
      const redis = createMockRedis()
      redis.store.set('graph-update', '1700000000')
      redis.hashStore.set('graph-data', new Map())

      const result = await getGraphForEntries(createMockDb(), redis, [
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

      const result = await getGraphForEntries(createMockDb(), redis, [
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

      const result = await getGraphForEntries(createMockDb(), redis, [
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

      expect(redis.rctfReplaceGraph).toHaveBeenCalled()
      expect(redis.rctfReplaceGraph).toHaveBeenCalledWith(
        'graph-update',
        'graph-data',
        'graph-fingerprint',
        'graph-cursor',
        'graph-source',
        expect.any(String),
        JSON.stringify({
          users: ['user1'],
          challenges: ['challenge1'],
          endTime: config.endTime,
        }),
        JSON.stringify({
          time: new Date(1699995000).toISOString(),
          ids: ['evt2'],
        }),
        'events',
        // both events land in the same 30min sample bucket
        ['user1', '1701000000,100']
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

      expect(redis.rctfReplaceGraph).toHaveBeenCalledWith(
        'graph-update',
        'graph-data',
        'graph-fingerprint',
        'graph-cursor',
        'graph-source',
        expect.any(String),
        JSON.stringify({
          users: ['user1'],
          challenges: ['challenge1'],
          endTime: config.endTime,
        }),
        '',
        'events',
        []
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

      expect(redis.rctfReplaceGraph).toHaveBeenCalledWith(
        'graph-update',
        'graph-data',
        'graph-fingerprint',
        'graph-cursor',
        'graph-source',
        '1699995000',
        JSON.stringify({
          users: ['user1'],
          challenges: ['challenge1'],
          endTime: config.endTime,
        }),
        '',
        'samples',
        ['user1', '1699990000,50,1699995000,100']
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
            pointsDelta: 75,
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
      expect(redis.rctfReplaceGraph).toHaveBeenLastCalledWith(
        'graph-update',
        'graph-data',
        'graph-fingerprint',
        'graph-cursor',
        'graph-source',
        expect.any(String),
        JSON.stringify({
          users: ['user1'],
          challenges: ['challenge1'],
          endTime: config.endTime,
        }),
        JSON.stringify({
          time: new Date(1699995000).toISOString(),
          ids: ['evt1'],
        }),
        'events',
        ['user1', '1701000000,75']
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

      expect(redis.rctfReplaceGraph).toHaveBeenCalledWith(
        'graph-update',
        'graph-data',
        'graph-fingerprint',
        'graph-cursor',
        'graph-source',
        expect.any(String),
        JSON.stringify({
          users: ['user1', 'user2'],
          challenges: ['challenge1'],
          endTime: config.endTime,
        }),
        JSON.stringify({
          time: new Date(1699995000).toISOString(),
          ids: ['evt3', 'evt4'],
        }),
        'events',
        ['user1', '1701000000,70', 'user2', '1701000000,50']
      )
    })

    test('buckets dense score events to the graph sample grid', async () => {
      const redis = createMockRedis()
      const sampleTime = Math.max(1000, config.leaderboard.graphSampleTime)
      const base = 900 * sampleTime
      // 40 events one minute apart: far denser than the sample grid
      const db = createMockDb(
        Array.from({ length: 40 }, (_, i) => ({
          id: `evt${i}`,
          userid: 'user1',
          pointsDelta: 5,
          eventAt: new Date(base + 1 + i * 60_000).toISOString(),
        }))
      )
      const data: CalculatedLeaderboard = {
        users: [
          {
            id: 'user1',
            name: 'User One',
            division: 'open',
            score: 200,
            hadAnySolve: true,
            lastSolve: base + 1 + 39 * 60_000,
            lastTiebreakEligibleSolve: undefined,
          },
        ],
        challengeInfos,

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.hashStore.get('graph-data')?.get('user1')).toBe(
        `${base + sampleTime},150,${base + 2 * sampleTime},200`
      )
    })

    test('updates graph incrementally from the score event cursor', async () => {
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
      expect(redis.rctfReplaceGraph).toHaveBeenCalledTimes(1)
      expect(redis.hashStore.get('graph-data')?.get('user1')).toBe(
        '1701000000,50'
      )

      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.rctfReplaceGraph).toHaveBeenCalledTimes(1)
      expect(redis.rctfMergeGraph).toHaveBeenLastCalledWith(
        'graph-update',
        'graph-data',
        'graph-fingerprint',
        'graph-cursor',
        'graph-source',
        expect.any(String),
        JSON.stringify({
          users: ['user1'],
          challenges: ['challenge1'],
          endTime: config.endTime,
        }),
        JSON.stringify({
          time: new Date(1699995000).toISOString(),
          ids: ['evt2'],
        }),
        'events',
        // the incremental event replaces the seed point in the same bucket
        ['user1', '1701000000,75']
      )
      expect(redis.hashStore.get('graph-data')?.get('user1')).toBe(
        '1701000000,75'
      )
      expect(JSON.parse(redis.store.get('graph-cursor') ?? '{}')).toEqual({
        time: new Date(1699995000).toISOString(),
        ids: ['evt2'],
      })
    })

    test('dedupes replayed cursor-timestamp events while accepting new lower-id events', async () => {
      const redis = createMockRedis()
      const eventTime = new Date(1699990000).toISOString()
      const db = createMockDb([
        [
          {
            id: 'evt-z',
            userid: 'user1',
            pointsDelta: 50,
            eventAt: eventTime,
          },
        ],
        [
          {
            id: 'evt-a',
            userid: 'user1',
            pointsDelta: 25,
            eventAt: eventTime,
          },
          {
            id: 'evt-z',
            userid: 'user1',
            pointsDelta: 50,
            eventAt: eventTime,
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
            lastSolve: 1699990000,
            lastTiebreakEligibleSolve: undefined,
          },
        ],
        challengeInfos,

        samples: [],
      }

      await cacheLeaderboardAndGraph(db, redis, data)
      await cacheLeaderboardAndGraph(db, redis, data)

      expect(redis.hashStore.get('graph-data')?.get('user1')).toBe(
        '1701000000,75'
      )
      expect(JSON.parse(redis.store.get('graph-cursor') ?? '{}')).toEqual({
        time: eventTime,
        ids: ['evt-a', 'evt-z'],
      })
    })
  })

  describe('graph time after competition end', () => {
    const userData = (
      score: number,
      lastSolve: number
    ): CalculatedLeaderboard => ({
      users: [
        {
          id: 'user1',
          name: 'User One',
          division: 'open',
          score,
          hadAnySolve: true,
          lastSolve,
          lastTiebreakEligibleSolve: undefined,
        },
      ],
      challengeInfos,
      samples: [],
    })

    test('idle ticks stop the graph clock at endTime instead of "now"', async () => {
      const originalEndTime = config.endTime
      const endTime = 1700000000
      config.endTime = endTime

      try {
        const redis = createMockRedis()
        const db = createMockDb([
          [
            {
              id: 'evt1',
              userid: 'user1',
              pointsDelta: 50,
              eventAt: new Date(endTime - 10000).toISOString(),
            },
          ],
          [],
        ])
        const data = userData(50, endTime - 10000)

        await cacheLeaderboardAndGraph(db, redis, data)
        expect(Number(redis.store.get('graph-update'))).toBe(endTime)

        await cacheLeaderboardAndGraph(db, redis, data)
        expect(Number(redis.store.get('graph-update'))).toBe(endTime)

        const [entry] = await getGraphForEntries(db, redis, [
          { id: 'user1', name: 'User One', score: 50 },
        ])
        expect(entry!.points[0]).toEqual({ time: endTime, score: 50 })
      } finally {
        config.endTime = originalEndTime
      }
    })

    test('late deliveries land on the grid after the end and idle ticks never regress them', async () => {
      const originalEndTime = config.endTime
      const endTime = 1700000000
      config.endTime = endTime

      try {
        const redis = createMockRedis()
        const db = createMockDb([
          [
            {
              id: 'evt1',
              userid: 'user1',
              pointsDelta: 50,
              eventAt: new Date(endTime - 10000).toISOString(),
            },
            {
              id: 'evt2',
              userid: 'user1',
              pointsDelta: 25,
              eventAt: new Date(endTime + 5000).toISOString(),
            },
          ],
          [],
        ])
        const data = userData(75, endTime + 5000)

        // in-time bucket clamps to endTime; the late event stays a distinct
        // point on the next grid line
        const lateBucket = Math.ceil((endTime + 5000) / 1_800_000) * 1_800_000
        await cacheLeaderboardAndGraph(db, redis, data)
        expect(redis.hashStore.get('graph-data')?.get('user1')).toBe(
          `${endTime},50,${lateBucket},75`
        )
        expect(Number(redis.store.get('graph-update'))).toBe(endTime + 5000)

        await cacheLeaderboardAndGraph(db, redis, data)
        expect(Number(redis.store.get('graph-update'))).toBe(endTime + 5000)

        const [entry] = await getGraphForEntries(db, redis, [
          { id: 'user1', name: 'User One', score: 75 },
        ])
        expect(entry!.points[0]).toEqual({ time: lateBucket, score: 75 })
      } finally {
        config.endTime = originalEndTime
      }
    })
  })
})
