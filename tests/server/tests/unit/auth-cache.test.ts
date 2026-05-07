import { config } from '@rctf/config'
import { describe, expect, mock, test } from 'bun:test'
import {
  checkLoginVerification,
  createLoginVerification,
  createLoginVerificationWithId,
  deletePendingRegisterVerification,
  getCachedUser,
  getPendingRegisterVerification,
  getPendingRegisterVerifications,
  invalidateUserCache,
  setCachedUser,
  storeLoginVerification,
} from '../../../../apps/api/src/cache/auth-cache'
import type { TypedRedis } from '../../../../apps/api/src/cache/scripts'
import { parseToken, TokenKind } from '../../../../apps/api/src/lib/tokens'

const createMockRedis = () => {
  const store = new Map<string, string>()
  const expiries = new Map<string, number>()
  const zsets = new Map<string, Map<string, number>>()

  const scoreBound = (value: number | string) =>
    value === '-inf' ? -Infinity : value === '+inf' ? Infinity : Number(value)

  return {
    store,
    zsets,
    get: mock(async (key: string) => {
      const expiresAt = expiries.get(key)
      if (expiresAt !== undefined && expiresAt <= Date.now()) {
        store.delete(key)
        expiries.delete(key)
        return null
      }
      return store.get(key) ?? null
    }),
    set: mock(
      async (key: string, value: string, mode?: string, ttl?: number) => {
        store.set(key, value)
        if (mode === 'PX' && ttl !== undefined) {
          expiries.set(key, Date.now() + ttl)
        }
        return 'OK'
      }
    ),
    del: mock(async (key: string) => {
      const existed = store.has(key)
      store.delete(key)
      expiries.delete(key)
      return existed ? 1 : 0
    }),
    pttl: mock(async (key: string) => {
      if (!store.has(key)) return -2
      const expiresAt = expiries.get(key)
      if (expiresAt === undefined) return -1
      return Math.max(0, expiresAt - Date.now())
    }),
    zadd: mock(async (key: string, score: number, value: string) => {
      const zset = zsets.get(key) ?? new Map<string, number>()
      const added = zset.has(value) ? 0 : 1
      zset.set(value, score)
      zsets.set(key, zset)
      return added
    }),
    zrem: mock(async (key: string, value: string) => {
      const zset = zsets.get(key)
      if (!zset) return 0
      const existed = zset.delete(value)
      return existed ? 1 : 0
    }),
    zrangebyscore: mock(
      async (key: string, min: number | string, max: number | string) => {
        const minScore = scoreBound(min)
        const maxScore = scoreBound(max)
        return Array.from(zsets.get(key) ?? [])
          .filter(([, score]) => score >= minScore && score <= maxScore)
          .sort((a, b) => a[1] - b[1])
          .map(([value]) => value)
      }
    ),
    zremrangebyscore: mock(
      async (key: string, min: number | string, max: number | string) => {
        const zset = zsets.get(key)
        if (!zset) return 0

        const minScore = scoreBound(min)
        const maxScore = scoreBound(max)
        let removed = 0
        for (const [value, score] of zset) {
          if (score >= minScore && score <= maxScore) {
            zset.delete(value)
            removed += 1
          }
        }
        return removed
      }
    ),
    zrevrange: mock(async (key: string, start: number, stop: number) =>
      Array.from(zsets.get(key) ?? [])
        .sort((a, b) => b[1] - a[1])
        .slice(start, stop + 1)
        .map(([value]) => value)
    ),
    zcard: mock(async (key: string) => zsets.get(key)?.size ?? 0),
  } as unknown as TypedRedis & {
    store: Map<string, string>
    zsets: Map<string, Map<string, number>>
  }
}

describe('auth-cache', () => {
  describe('getCachedUser', () => {
    test('returns null when user is not cached', async () => {
      const redis = createMockRedis()
      const result = await getCachedUser(redis, 'non-existent-user')
      expect(result).toBeNull()
    })

    test('returns cached user with parsed date', async () => {
      const redis = createMockRedis()
      const createdAt = new Date('2024-01-15T10:30:00Z')
      const user = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        division: 'open',
        createdAt: createdAt.toISOString(),
      }
      redis.store.set('user:user-123', JSON.stringify(user))

      const result = await getCachedUser(redis, 'user-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-123')
      expect(result?.name).toBe('Test User')
      const resultCreatedAt = new Date(result?.createdAt!)
      expect(resultCreatedAt.getTime()).toBe(createdAt.getTime())
    })

    test('handles invalid JSON by deleting cache and returning null', async () => {
      const redis = createMockRedis()
      redis.store.set('user:user-123', 'invalid json {{{')

      const result = await getCachedUser(redis, 'user-123')

      expect(result).toBeNull()
      expect(redis.del).toHaveBeenCalledWith('user:user-123')
      expect(redis.store.has('user:user-123')).toBe(false)
    })
  })

  describe('setCachedUser', () => {
    test('caches user with TTL', async () => {
      const redis = createMockRedis()
      const user = {
        id: 'user-456',
        name: 'Another User',
        email: 'another@example.com',
        division: 'student',
        createdAt: new Date(),
      }

      await setCachedUser(redis, user as any)

      expect(redis.set).toHaveBeenCalled()
      const storedValue = redis.store.get('user:user-456')
      expect(storedValue).toBeDefined()
      const parsed = JSON.parse(storedValue!)
      expect(parsed.id).toBe('user-456')
    })
  })

  describe('invalidateUserCache', () => {
    test('deletes cached user', async () => {
      const redis = createMockRedis()
      redis.store.set('user:user-789', JSON.stringify({ id: 'user-789' }))

      await invalidateUserCache(redis, 'user-789')

      expect(redis.del).toHaveBeenCalledWith('user:user-789')
      expect(redis.store.has('user:user-789')).toBe(false)
    })
  })

  describe('storeLoginVerification', () => {
    test('stores verification with login timeout', async () => {
      const redis = createMockRedis()
      const verifyId = 'verify-abc-123'

      await storeLoginVerification(redis, verifyId)

      expect(redis.set).toHaveBeenCalledWith(
        `login:${verifyId}`,
        '0',
        'PX',
        config.loginTimeout
      )
      expect(redis.store.get(`login:${verifyId}`)).toBe('0')
    })

    test('indexes pending register verification metadata', async () => {
      const redis = createMockRedis()
      const verifyId = 'verify-register-123'

      await storeLoginVerification(redis, verifyId, {
        kind: 'register',
        email: 'pending@example.com',
        name: 'Pending Team',
        division: 'open',
      })

      expect(redis.zadd).toHaveBeenCalled()
      expect(redis.store.get(`login:register:${verifyId}`)).toBeDefined()
      expect(redis.zsets.get('login:registers')?.has(verifyId)).toBe(true)
    })
  })

  describe('checkLoginVerification', () => {
    test('returns true when verification exists and deletes it', async () => {
      const redis = createMockRedis()
      const verifyId = 'verify-def-456'
      redis.store.set(`login:${verifyId}`, '0')

      const result = await checkLoginVerification(redis, verifyId)

      expect(result).toBe(true)
      expect(redis.del).toHaveBeenCalledWith(`login:${verifyId}`)
      expect(redis.store.has(`login:${verifyId}`)).toBe(false)
    })

    test('removes pending register metadata when verification is consumed', async () => {
      const redis = createMockRedis()
      const token = await createLoginVerification(redis, {
        kind: 'register',
        email: 'consume@example.com',
        name: 'Consume Team',
        division: 'open',
      })
      const parsed = await parseToken(TokenKind.Verify, token)

      const result = await checkLoginVerification(redis, parsed!.verifyId)

      expect(result).toBe(true)
      expect(redis.store.has(`login:register:${parsed!.verifyId}`)).toBe(false)
      expect(redis.zsets.get('login:registers')?.has(parsed!.verifyId)).toBe(
        false
      )
    })

    test('returns false when verification does not exist', async () => {
      const redis = createMockRedis()
      const verifyId = 'non-existent-verify'

      const result = await checkLoginVerification(redis, verifyId)

      expect(result).toBe(false)
      expect(redis.del).toHaveBeenCalledWith(`login:${verifyId}`)
    })
  })

  describe('createLoginVerification', () => {
    test('creates verification for register flow', async () => {
      const redis = createMockRedis()
      const data = {
        kind: 'register' as const,
        email: 'newuser@example.com',
        name: 'New User',
        division: 'open',
      }

      const token = await createLoginVerification(redis, data)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(redis.set).toHaveBeenCalled()

      // Verify the token can be parsed and contains correct data
      const parsed = await parseToken(TokenKind.Verify, token)
      expect(parsed).not.toBeNull()
      expect(parsed?.kind).toBe('register')
      if (parsed?.kind === 'register') {
        expect(parsed.email).toBe('newuser@example.com')
        expect(parsed.name).toBe('New User')
        expect(parsed.division).toBe('open')
      }
      expect(parsed?.verifyId).toBeDefined()
    })

    test('can return the verification id with the token', async () => {
      const redis = createMockRedis()
      const verification = await createLoginVerificationWithId(redis, {
        kind: 'register',
        email: 'with-id@example.com',
        name: 'With Id Team',
        division: 'open',
      })

      const parsed = await parseToken(TokenKind.Verify, verification.token)
      expect(parsed?.verifyId).toBe(verification.id)
      expect(redis.store.get(`login:${verification.id}`)).toBe('0')
    })

    test('lists pending register verifications with pagination', async () => {
      const redis = createMockRedis()
      const first = await createLoginVerificationWithId(redis, {
        kind: 'register',
        email: 'first@example.com',
        name: 'First Team',
        division: 'open',
      })
      const second = await createLoginVerificationWithId(redis, {
        kind: 'register',
        email: 'second@example.com',
        name: 'Second Team',
        division: 'open',
      })

      const page = await getPendingRegisterVerifications(redis, {
        limit: 1,
        offset: 0,
      })

      expect(page.total).toBe(2)
      expect(page.verifications).toHaveLength(1)
      expect([first.id, second.id]).toContain(page.verifications[0].verifyId)
    })

    test('prunes expired pending register verification metadata before listing', async () => {
      const redis = createMockRedis()
      const verifyId = 'expired-register'
      redis.store.set(
        `login:register:${verifyId}`,
        JSON.stringify({
          kind: 'register',
          email: 'expired@example.com',
          name: 'Expired Team',
          division: 'open',
          createdAt: Date.now() - config.loginTimeout,
        })
      )
      redis.store.set(`login:${verifyId}`, '0')
      redis.zsets.set('login:registers', new Map([[verifyId, Date.now() - 1]]))

      const page = await getPendingRegisterVerifications(redis, {
        limit: 100,
        offset: 0,
      })

      expect(page.total).toBe(0)
      expect(page.verifications).toHaveLength(0)
      expect(redis.store.has(`login:register:${verifyId}`)).toBe(false)
      expect(redis.store.has(`login:${verifyId}`)).toBe(false)
    })

    test('can delete pending register verification metadata directly', async () => {
      const redis = createMockRedis()
      const verification = await createLoginVerificationWithId(redis, {
        kind: 'register',
        email: 'delete@example.com',
        name: 'Delete Team',
        division: 'open',
      })

      await deletePendingRegisterVerification(redis, verification.id)

      expect(
        await getPendingRegisterVerification(redis, verification.id)
      ).toBeUndefined()
      expect(redis.store.has(`login:${verification.id}`)).toBe(false)
      expect(redis.zsets.get('login:registers')?.has(verification.id)).toBe(
        false
      )
    })

    test('creates verification for update flow', async () => {
      const redis = createMockRedis()
      const data = {
        kind: 'update' as const,
        userId: 'user-123',
        email: 'updated@example.com',
      }

      const token = await createLoginVerification(redis, data)

      expect(token).toBeDefined()

      const parsed = await parseToken(TokenKind.Verify, token)
      expect(parsed).not.toBeNull()
      expect(parsed?.kind).toBe('update')
      if (parsed?.kind === 'update') {
        expect(parsed.userId).toBe('user-123')
        expect(parsed.email).toBe('updated@example.com')
      }
      expect(parsed?.verifyId).toBeDefined()
    })

    test('creates verification for recover flow', async () => {
      const redis = createMockRedis()
      const data = {
        kind: 'recover' as const,
        userId: 'user-456',
        email: 'recover@example.com',
      }

      const token = await createLoginVerification(redis, data)

      expect(token).toBeDefined()

      const parsed = await parseToken(TokenKind.Verify, token)
      expect(parsed).not.toBeNull()
      expect(parsed?.kind).toBe('recover')
      if (parsed?.kind === 'recover') {
        expect(parsed.userId).toBe('user-456')
        expect(parsed.email).toBe('recover@example.com')
      }
      expect(parsed?.verifyId).toBeDefined()
    })

    test('stores login verification in redis with generated verifyId', async () => {
      const redis = createMockRedis()
      const data = {
        kind: 'register' as const,
        email: 'test@example.com',
        name: 'Test',
        division: 'open',
      }

      const token = await createLoginVerification(redis, data)

      // Verify that storeLoginVerification was called
      expect(redis.set).toHaveBeenCalled()

      // Get the verifyId from the token and check it was stored
      const parsed = await parseToken(TokenKind.Verify, token)
      expect(parsed?.verifyId).toBeDefined()

      // Check the redis store has an entry for login:verifyId
      const loginKey = `login:${parsed?.verifyId}`
      expect(redis.store.get(loginKey)).toBe('0')
    })
  })
})
