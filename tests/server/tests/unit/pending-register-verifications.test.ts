import { config } from '@rctf/config'
import { describe, expect, mock, test } from 'bun:test'
import {
  checkLoginVerification,
  createLoginVerification,
} from '../../../../apps/api/src/cache/auth-cache'
import {
  createPendingRegisterVerification,
  deletePendingRegisterVerification,
  deletePendingRegisterVerificationMetadata,
  getPendingRegisterVerification,
  getPendingRegisterVerifications,
} from '../../../../apps/api/src/cache/pending-register-verifications'
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
      const existed = store.has(key) || zsets.has(key)
      store.delete(key)
      expiries.delete(key)
      zsets.delete(key)
      return existed ? 1 : 0
    }),
    pttl: mock(async (key: string) => {
      if (!store.has(key)) return -2
      const expiresAt = expiries.get(key)
      if (expiresAt === undefined) return -1
      return Math.max(0, expiresAt - Date.now())
    }),
    pexpire: mock(async (key: string, ttl: number) => {
      if (!store.has(key) && !zsets.has(key)) return 0
      expiries.set(key, Date.now() + ttl)
      return 1
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

describe('pending-register-verifications', () => {
  test('creates a pending register verification with an expiring index', async () => {
    const redis = createMockRedis()

    const verification = await createPendingRegisterVerification(redis, {
      kind: 'register',
      email: 'pending@example.com',
      name: 'Pending Team',
      division: 'open',
    })

    const parsed = await parseToken(TokenKind.Verify, verification.token)
    expect(parsed?.verifyId).toBe(verification.id)
    expect(redis.store.get(`login:${verification.id}`)).toBe('0')
    expect(redis.store.get(`login:register:${verification.id}`)).toBeDefined()
    expect(redis.zsets.get('login:registers')?.has(verification.id)).toBe(true)
    expect(redis.pexpire).toHaveBeenCalledWith(
      'login:registers',
      config.loginTimeout
    )
  })

  test('does not list ordinary update verifications', async () => {
    const redis = createMockRedis()
    await createLoginVerification(redis, {
      kind: 'update',
      userId: 'user-123',
      email: 'new@example.com',
    })

    const page = await getPendingRegisterVerifications(redis, {
      limit: 100,
      offset: 0,
    })

    expect(page.total).toBe(0)
    expect(page.verifications).toHaveLength(0)
  })

  test('lists pending register verifications with pagination', async () => {
    const redis = createMockRedis()
    const first = await createPendingRegisterVerification(redis, {
      kind: 'register',
      email: 'first@example.com',
      name: 'First Team',
      division: 'open',
    })
    const second = await createPendingRegisterVerification(redis, {
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

  test('removes pending metadata after a register verification is consumed', async () => {
    const redis = createMockRedis()
    const verification = await createPendingRegisterVerification(redis, {
      kind: 'register',
      email: 'consume@example.com',
      name: 'Consume Team',
      division: 'open',
    })

    expect(await checkLoginVerification(redis, verification.id)).toBe(true)
    await deletePendingRegisterVerificationMetadata(redis, verification.id)

    expect(redis.store.has(`login:register:${verification.id}`)).toBe(false)
    expect(redis.zsets.get('login:registers')?.has(verification.id)).toBe(false)
  })

  test('prunes expired pending register verifications before listing', async () => {
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

  test('deletes pending register verification state directly', async () => {
    const redis = createMockRedis()
    const verification = await createPendingRegisterVerification(redis, {
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
    expect(redis.zsets.get('login:registers')?.has(verification.id)).toBe(false)
  })
})
