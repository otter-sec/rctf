import { beforeEach, describe, expect, mock, test } from 'bun:test'
import {
  cacheLeaderboardAndGraph,
  getCachedChallenges,
  getFullLeaderboard,
  getGraph,
  getLeaderboard,
  getLeaderboardWithChallenges,
  getUserScore,
  type CalculatedLeaderboard,
} from '../../../../apps/api/src/cache/leaderboard'
import type { TypedRedis } from '../../../../apps/api/src/cache/scripts'

const createMockRedis = () => {
  const store = new Map<string, string>()
  const hashStore = new Map<string, Map<string, string>>()
  const listStore = new Map<string, string[]>()

  return {
    store,
    hashStore,
    listStore,
    get: mock(async (key: string) => store.get(key) ?? null),
    set: mock(async (key: string, value: string) => {
      store.set(key, value)
      return 'OK'
    }),
    del: mock(async (key: string) => {
      const existed = store.has(key)
      store.delete(key)
      return existed ? 1 : 0
    }),
    llen: mock(async (key: string) => {
      return listStore.get(key)?.length ?? 0
    }),
    hmget: mock(async (key: string, ...fields: string[]) => {
      const hash = hashStore.get(key)
      return fields.map(f => hash?.get(f) ?? null)
    }),
    hget: mock(async (key: string, field: string) => {
      const hash = hashStore.get(key)
      return hash?.get(field) ?? null
    }),
    hgetall: mock(async (key: string) => {
      const hash = hashStore.get(key)
      if (!hash) return {}
      const result: Record<string, string> = {}
      for (const [k, v] of hash) {
        result[k] = v
      }
      return result
    }),
    rctfSetLeaderboard: mock(async (_keys: number, ..._args: string[]) => {}),
    rctfSetGraph: mock(async (_keys: number, ..._args: string[]) => {}),
    rctfGetLeaderboardWithChallenges: mock(
      async (
        _leaderboardKey: string,
        _challengeInfoKey: string,
        _start: string,
        _end: string,
        _includeRange: string
      ): Promise<[string[], number | string, string[]]> => {
        return [[], 0, []]
      }
    ),
    rctfGetGraph: mock(
      async (
        _leaderboardKey: string,
        _leaderboardUpdateKey: string,
        _graphDataKey: string,
        _limit: string,
        _offset: string,
        _isDivision: '1' | '0'
      ): Promise<string> => {
        return JSON.stringify(['0', [], []])
      }
    ),
    rctfGetRange: mock(
      async (
        _leaderboardKey: string,
        _start: string,
        _end: string
      ): Promise<string[]> => {
        return []
      }
    ),
  } as unknown as TypedRedis & {
    store: Map<string, string>
    hashStore: Map<string, Map<string, string>>
    listStore: Map<string, string[]>
  }
}

describe('leaderboard cache', () => {
  describe('getGraph', () => {
    test('returns empty array when no data', async () => {
      const redis = createMockRedis()

      const result = await getGraph(redis, 10, 0)

      expect(result).toEqual([])
      expect(redis.rctfGetGraph).toHaveBeenCalledWith(
        'global-leaderboard',
        'leaderboard-update',
        'graph-data',
        '10',
        '0',
        '0'
      )
    })

    test('returns graph entries with division', async () => {
      const redis = createMockRedis()
      redis.rctfGetGraph = mock(async () =>
        JSON.stringify([
          '1700000000',
          ['user1', 'User One', '100'],
          ['1699999000,50'],
        ])
      )

      const result = await getGraph(redis, 10, 0, 'open')

      expect(redis.rctfGetGraph).toHaveBeenCalledWith(
        'division-leaderboard:open',
        'leaderboard-update',
        'graph-data',
        '10',
        '0',
        '1'
      )
      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('user1')
      expect(result[0]!.name).toBe('User One')
      expect(result[0]!.points).toHaveLength(2)
    })

    test('parses multiple users with graph points', async () => {
      const redis = createMockRedis()
      redis.rctfGetGraph = mock(async () =>
        JSON.stringify([
          '1700000000',
          [
            'user1',
            'User One',
            '100',
            'open',
            '1',
            'user2',
            'User Two',
            '80',
            'open',
            '2',
          ],
          ['1699990000,30,1699995000,70', '1699990000,20,1699995000,60'],
        ])
      )

      const result = await getGraph(redis, 10, 0)

      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBe('user1')
      expect(result[0]!.points).toHaveLength(3) // current + 2 historical
      expect(result[1]!.id).toBe('user2')
      expect(result[1]!.points).toHaveLength(3)
    })

    test('handles empty graph points', async () => {
      const redis = createMockRedis()
      redis.rctfGetGraph = mock(async () =>
        JSON.stringify(['1700000000', ['user1', 'User One', '100'], [null]])
      )

      const result = await getGraph(redis, 10, 0)

      expect(result).toHaveLength(1)
      expect(result[0]!.points).toHaveLength(1) // only current point
      expect(result[0]!.points[0]!.time).toBe(1700000000)
      expect(result[0]!.points[0]!.score).toBe(100)
    })

    test('handles lastUpdate of 0', async () => {
      const redis = createMockRedis()
      redis.rctfGetGraph = mock(async () =>
        JSON.stringify(['0', ['user1', 'User One', '100'], ['1699990000,50']])
      )

      const result = await getGraph(redis, 10, 0)

      expect(result).toHaveLength(1)
      expect(result[0]!.points).toHaveLength(1)
      expect(result[0]!.points[0]!.time).toBe(1699990000)
    })

    test('sorts points by time descending', async () => {
      const redis = createMockRedis()
      redis.rctfGetGraph = mock(async () =>
        JSON.stringify([
          '1700000000',
          ['user1', 'User One', '100'],
          ['1699980000,20,1699990000,50'],
        ])
      )

      const result = await getGraph(redis, 10, 0)

      expect(result[0]!.points[0]!.time).toBe(1700000000) // most recent first
      expect(result[0]!.points[1]!.time).toBe(1699990000)
      expect(result[0]!.points[2]!.time).toBe(1699980000)
    })
  })

  describe('getLeaderboard', () => {
    test('returns total only when limit is 0', async () => {
      const redis = createMockRedis()
      redis.listStore.set('global-leaderboard', Array(25).fill('item'))

      const result = await getLeaderboard(redis, 0, 0)

      expect(result.total).toBe(5) // 25 items / 5 keys per user
      expect(result.leaderboard).toEqual([])
      expect(redis.rctfGetRange).not.toHaveBeenCalled()
    })

    test('returns division total when limit is 0', async () => {
      const redis = createMockRedis()
      redis.listStore.set('division-leaderboard:open', Array(15).fill('item'))

      const result = await getLeaderboard(redis, 0, 0, 'open')

      expect(result.total).toBe(5) // 15 items / 3 keys per user (division)
      expect(result.leaderboard).toEqual([])
    })

    test('fetches leaderboard with limit', async () => {
      const redis = createMockRedis()
      redis.rctfGetRange = mock(async () => [
        'user1',
        'User One',
        '100',
        'open',
        '1',
        '5', // total (last element)
      ])

      const result = await getLeaderboard(redis, 10, 0)

      expect(result.total).toBe(1) // 5 / 5 keys
      expect(result.leaderboard).toHaveLength(1)
      expect(result.leaderboard[0]).toEqual({
        id: 'user1',
        name: 'User One',
        score: 100,
        division: 'open',
        divisionPlace: 1,
      })
    })

    test('fetches division leaderboard with offset', async () => {
      const redis = createMockRedis()
      redis.rctfGetRange = mock(async () => [
        'user2',
        'User Two',
        '80',
        '6', // total
      ])

      const result = await getLeaderboard(redis, 5, 2, 'open')

      expect(result.total).toBe(2) // 6 / 3 keys per user
      expect(result.leaderboard).toHaveLength(1)
      expect(result.leaderboard[0]!.divisionPlace).toBe(3) // offset (2) + idx (0) + 1
    })
  })

  describe('getFullLeaderboard', () => {
    test('returns full global leaderboard', async () => {
      const redis = createMockRedis()
      redis.rctfGetRange = mock(async () => [
        'user1',
        'User One',
        '100',
        'open',
        '1',
        'user2',
        'User Two',
        '80',
        'student',
        '1',
        '10', // total
      ])

      const result = await getFullLeaderboard(redis)

      expect(redis.rctfGetRange).toHaveBeenCalledWith(
        'global-leaderboard',
        '0',
        '-1'
      )
      expect(result.total).toBe(2) // 10 / 5 keys
      expect(result.leaderboard).toHaveLength(2)
    })

    test('returns full division leaderboard', async () => {
      const redis = createMockRedis()
      redis.rctfGetRange = mock(async () => [
        'user1',
        'User One',
        '100',
        'user2',
        'User Two',
        '80',
        '6', // total
      ])

      const result = await getFullLeaderboard(redis, 'open')

      expect(redis.rctfGetRange).toHaveBeenCalledWith(
        'division-leaderboard:open',
        '0',
        '-1'
      )
      expect(result.total).toBe(2) // 6 / 3 keys
      expect(result.leaderboard[0]!.division).toBe('open')
      expect(result.leaderboard[0]!.divisionPlace).toBe(1)
      expect(result.leaderboard[1]!.divisionPlace).toBe(2)
    })
  })

  describe('getLeaderboardWithChallenges', () => {
    test('returns leaderboard with challenge info', async () => {
      const redis = createMockRedis()
      redis.rctfGetLeaderboardWithChallenges = mock(
        async (): Promise<[string[], number | string, string[]]> => [
          ['user1', 'User One', '100', 'open', '1'],
          15, // total
          [
            'chall1',
            JSON.stringify({
              name: 'Challenge 1',
              category: 'web',
              score: 100,
              solves: 5,
              sortWeight: null,
            }),
          ],
        ]
      )

      const result = await getLeaderboardWithChallenges(redis, 10, 0)

      expect(result.total).toBe(3) // 15 / 5 keys
      expect(result.leaderboard).toHaveLength(1)
      expect(result.challenges).toBeDefined()
      expect(result.challenges['chall1']).toEqual({
        name: 'Challenge 1',
        category: 'web',
        score: 100,
        solves: 5,
        sortWeight: null,
      })
    })

    test('handles empty range when limit is 0', async () => {
      const redis = createMockRedis()
      redis.rctfGetLeaderboardWithChallenges = mock(
        async (): Promise<[string[], number | string, string[]]> => [
          [],
          10,
          ['chall1', JSON.stringify({ name: 'Challenge 1', score: 100 })],
        ]
      )

      const result = await getLeaderboardWithChallenges(redis, 0, 0)

      expect(result.leaderboard).toEqual([])
      expect(result.total).toBe(2) // 10 / 5
      expect(result.challenges['chall1']).toBeDefined()
    })

    test('handles division leaderboard', async () => {
      const redis = createMockRedis()
      redis.rctfGetLeaderboardWithChallenges = mock(
        async (): Promise<[string[], number | string, string[]]> => [
          ['user1', 'User One', '100'],
          9,
          [],
        ]
      )

      const result = await getLeaderboardWithChallenges(redis, 5, 1, 'open')

      expect(result.total).toBe(3) // 9 / 3 keys
      expect(result.leaderboard[0]!.division).toBe('open')
      expect(result.leaderboard[0]!.divisionPlace).toBe(2) // offset (1) + idx (0) + 1
    })

    test('parses challenge info with missing fields', async () => {
      const redis = createMockRedis()
      redis.rctfGetLeaderboardWithChallenges = mock(
        async (): Promise<[string[], number | string, string[]]> => [
          [],
          0,
          [
            'chall1',
            JSON.stringify({ name: 'Test' }), // missing score, solves, category
            'chall2',
            '', // empty value treated as missing
          ],
        ]
      )

      const result = await getLeaderboardWithChallenges(redis, 0, 0)

      expect(result.challenges['chall1']).toEqual({
        name: 'Test',
        category: null,
        score: null,
        solves: null,
        sortWeight: null,
      })
      expect(result.challenges['chall2']).toEqual({
        name: null,
        category: null,
        score: null,
        solves: null,
        sortWeight: null,
      })
    })
  })

  describe('getCachedChallenges', () => {
    test('returns empty object when no challenges cached', async () => {
      const redis = createMockRedis()

      const result = await getCachedChallenges(redis)

      expect(result).toEqual({})
    })

    test('returns all cached challenges', async () => {
      const redis = createMockRedis()
      const challengeHash = new Map<string, string>()
      challengeHash.set(
        'chall1',
        JSON.stringify({
          name: 'Challenge 1',
          category: 'web',
          score: 100,
          solves: 5,
          sortWeight: 1,
        })
      )
      challengeHash.set(
        'chall2',
        JSON.stringify({
          name: 'Challenge 2',
          category: 'crypto',
          score: 200,
          solves: 2,
          sortWeight: null,
        })
      )
      redis.hashStore.set('challenge-info', challengeHash)

      const result = await getCachedChallenges(redis)

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['chall1']).toEqual({
        name: 'Challenge 1',
        category: 'web',
        score: 100,
        solves: 5,
        sortWeight: 1,
      })
      expect(result['chall2']).toEqual({
        name: 'Challenge 2',
        category: 'crypto',
        score: 200,
        solves: 2,
        sortWeight: null,
      })
    })

    test('handles partial challenge data', async () => {
      const redis = createMockRedis()
      const challengeHash = new Map<string, string>()
      challengeHash.set('chall1', JSON.stringify({ name: 'Partial' }))
      redis.hashStore.set('challenge-info', challengeHash)

      const result = await getCachedChallenges(redis)

      expect(result['chall1']).toEqual({
        name: 'Partial',
        category: null,
        score: null,
        solves: null,
        sortWeight: null,
      })
    })
  })

  describe('getUserScore', () => {
    test('returns null values when user not found', async () => {
      const redis = createMockRedis()

      const result = await getUserScore(redis, 'unknown-user')

      expect(result).toEqual({
        score: null,
        place: null,
        divisionPlace: null,
      })
    })

    test('returns parsed score data when user found', async () => {
      const redis = createMockRedis()
      const scoreHash = new Map<string, string>()
      scoreHash.set('user1', '150,3,1') // score,place,divisionPlace
      redis.hashStore.set('score-positions', scoreHash)

      const result = await getUserScore(redis, 'user1')

      expect(result).toEqual({
        score: 150,
        place: 3,
        divisionPlace: 1,
      })
    })

    test('handles missing fields in score data', async () => {
      const redis = createMockRedis()
      const scoreHash = new Map<string, string>()
      scoreHash.set('user2', '100,,') // only score
      redis.hashStore.set('score-positions', scoreHash)

      const result = await getUserScore(redis, 'user2')

      expect(result.score).toBe(100)
      expect(result.place).toBeNaN()
      expect(result.divisionPlace).toBeNaN()
    })
  })

  describe('cacheLeaderboardAndGraph', () => {
    test('caches leaderboard data', async () => {
      const redis = createMockRedis()
      const data: CalculatedLeaderboard = {
        leaderboardUpdate: 1700000000,
        users: [
          {
            id: 'user1',
            name: 'User One',
            division: 'open',
            score: 100,
            hadAnySolve: true,
          },
          {
            id: 'user2',
            name: 'User Two',
            division: null,
            score: 80,
            hadAnySolve: true,
          },
        ],
        challengeInfos: new Map([
          [
            'chall1',
            {
              name: 'Challenge 1',
              category: 'web',
              score: 100,
              solves: 5,
              sortWeight: null,
            },
          ],
        ]),
        samples: [],
      }

      await cacheLeaderboardAndGraph(redis, data)

      expect(redis.rctfSetLeaderboard).toHaveBeenCalled()
      expect(redis.rctfSetGraph).not.toHaveBeenCalled()
    })

    test('caches graph data when samples exist', async () => {
      const redis = createMockRedis()
      const data: CalculatedLeaderboard = {
        leaderboardUpdate: 1700000000,
        users: [
          {
            id: 'user1',
            name: 'User One',
            division: 'open',
            score: 100,
            hadAnySolve: true,
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

      await cacheLeaderboardAndGraph(redis, data)

      expect(redis.rctfSetLeaderboard).toHaveBeenCalled()
      expect(redis.rctfSetGraph).toHaveBeenCalled()
    })

    test('handles empty users list', async () => {
      const redis = createMockRedis()
      const data: CalculatedLeaderboard = {
        leaderboardUpdate: 1700000000,
        users: [],
        challengeInfos: new Map(),
        samples: [],
      }

      await cacheLeaderboardAndGraph(redis, data)

      expect(redis.rctfSetLeaderboard).toHaveBeenCalled()
    })

    test('caches multiple challenge infos', async () => {
      const redis = createMockRedis()
      const data: CalculatedLeaderboard = {
        leaderboardUpdate: 1700000000,
        users: [],
        challengeInfos: new Map([
          [
            'chall1',
            {
              name: 'Web 1',
              category: 'web',
              score: 100,
              solves: 10,
              sortWeight: 1,
            },
          ],
          [
            'chall2',
            {
              name: 'Crypto 1',
              category: 'crypto',
              score: 200,
              solves: 3,
              sortWeight: 2,
            },
          ],
        ]),
        samples: [],
      }

      await cacheLeaderboardAndGraph(redis, data)

      expect(redis.rctfSetLeaderboard).toHaveBeenCalled()
      const call = (redis.rctfSetLeaderboard as any).mock.calls[0]
      expect(call).toBeDefined()
    })

    test('aggregates graph points per user across samples', async () => {
      const redis = createMockRedis()
      const data: CalculatedLeaderboard = {
        leaderboardUpdate: 1700000000,
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

      await cacheLeaderboardAndGraph(redis, data)

      expect(redis.rctfSetGraph).toHaveBeenCalled()
    })
  })
})
