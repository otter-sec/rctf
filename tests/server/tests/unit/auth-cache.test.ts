import { config } from '@rctf/config'
import { describe, expect, mock, test } from 'bun:test'
import {
  checkLoginVerification,
  createLoginVerification,
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
  const sets = new Map<string, Set<string>>()

  return {
    store,
    sets,
    get: mock(async (key: string) => store.get(key) ?? null),
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
    sadd: mock(async (key: string, value: string) => {
      const set = sets.get(key) ?? new Set<string>()
      const sizeBefore = set.size
      set.add(value)
      sets.set(key, set)
      return set.size - sizeBefore
    }),
    srem: mock(async (key: string, value: string) => {
      const set = sets.get(key)
      if (!set) return 0
      const existed = set.delete(value)
      return existed ? 1 : 0
    }),
    smembers: mock(async (key: string) => Array.from(sets.get(key) ?? [])),
  } as unknown as TypedRedis & {
    store: Map<string, string>
    sets: Map<string, Set<string>>
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

    test('stores pending register verification metadata', async () => {
      const redis = createMockRedis()
      const data = {
        kind: 'register' as const,
        email: 'pending@example.com',
        name: 'Pending Team',
        division: 'open',
      }

      const token = await createLoginVerification(redis, data)
      const parsed = await parseToken(TokenKind.Verify, token)
      expect(parsed?.verifyId).toBeDefined()

      const pending = await getPendingRegisterVerification(
        redis,
        parsed!.verifyId
      )
      expect(pending?.email).toBe(data.email)
      expect(pending?.name).toBe(data.name)
      expect(pending?.division).toBe(data.division)

      const allPending = await getPendingRegisterVerifications(redis)
      expect(allPending.map(entry => entry.verifyId)).toContain(
        parsed!.verifyId
      )
    })

    test('deletes pending register metadata when verification is consumed', async () => {
      const redis = createMockRedis()
      const token = await createLoginVerification(redis, {
        kind: 'register',
        email: 'consume@example.com',
        name: 'Consume Team',
        division: 'open',
      })
      const parsed = await parseToken(TokenKind.Verify, token)
      expect(parsed?.verifyId).toBeDefined()

      const consumed = await checkLoginVerification(redis, parsed!.verifyId)
      expect(consumed).toBe(true)
      expect(
        await getPendingRegisterVerification(redis, parsed!.verifyId)
      ).toBeUndefined()
    })

    test('can delete pending register verification metadata directly', async () => {
      const redis = createMockRedis()
      const token = await createLoginVerification(redis, {
        kind: 'register',
        email: 'delete@example.com',
        name: 'Delete Team',
        division: 'open',
      })
      const parsed = await parseToken(TokenKind.Verify, token)
      expect(parsed?.verifyId).toBeDefined()

      await deletePendingRegisterVerification(redis, parsed!.verifyId)

      expect(
        await getPendingRegisterVerification(redis, parsed!.verifyId)
      ).toBeUndefined()
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
