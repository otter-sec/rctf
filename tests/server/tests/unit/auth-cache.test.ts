import { config } from '@rctf/config'
import { describe, expect, mock, test } from 'bun:test'
import {
  checkLoginVerification,
  createLoginVerification,
  getCachedUser,
  hasLoginVerification,
  invalidateUserCache,
  setCachedUser,
  storeLoginVerification,
} from '../../../../apps/api/src/cache/auth-cache'
import type { TypedRedis } from '../../../../apps/api/src/cache/scripts'
import { parseToken, TokenKind } from '../../../../apps/api/src/lib/tokens'

const createMockRedis = () => {
  const store = new Map<string, string>()
  const expiries = new Map<string, number>()

  return {
    store,
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
  } as unknown as TypedRedis & { store: Map<string, string> }
}

describe('auth-cache', () => {
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

    expect(result?.id).toBe('user-123')
    expect(result?.name).toBe('Test User')
    expect(new Date(result?.createdAt!).getTime()).toBe(createdAt.getTime())
  })

  test('handles invalid cached user JSON by deleting the entry', async () => {
    const redis = createMockRedis()
    redis.store.set('user:user-123', 'invalid json {{{')

    const result = await getCachedUser(redis, 'user-123')

    expect(result).toBeNull()
    expect(redis.del).toHaveBeenCalledWith('user:user-123')
    expect(redis.store.has('user:user-123')).toBe(false)
  })

  test('caches and invalidates users', async () => {
    const redis = createMockRedis()
    const user = {
      id: 'user-456',
      name: 'Another User',
      email: 'another@example.com',
      division: 'student',
      createdAt: new Date(),
    }

    await setCachedUser(redis, user as any)
    expect(redis.store.get('user:user-456')).toBeDefined()

    await invalidateUserCache(redis, user.id)
    expect(redis.store.has('user:user-456')).toBe(false)
  })

  test('stores and consumes a login verification marker', async () => {
    const redis = createMockRedis()
    const verifyId = 'verify-abc-123'

    await storeLoginVerification(redis, verifyId)

    expect(redis.set).toHaveBeenCalledWith(
      `login:${verifyId}`,
      '0',
      'PX',
      config.loginTimeout
    )
    expect(await hasLoginVerification(redis, verifyId)).toBe(true)
    expect(await checkLoginVerification(redis, verifyId)).toBe(true)
    expect(await hasLoginVerification(redis, verifyId)).toBe(false)
  })

  test('creates generated update-email verification tokens', async () => {
    const redis = createMockRedis()
    const token = await createLoginVerification(redis, {
      kind: 'update',
      userId: 'user-123',
      email: 'updated@example.com',
    })

    const parsed = await parseToken(TokenKind.Verify, token)
    expect(parsed).toMatchObject({
      kind: 'update',
      userId: 'user-123',
      email: 'updated@example.com',
    })
    expect(redis.store.get(`login:${parsed?.verifyId}`)).toBe('0')
  })
})
