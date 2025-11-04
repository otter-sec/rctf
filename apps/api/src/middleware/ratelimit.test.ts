import { HTTPException } from 'hono/http-exception'
import { afterEach, expect, mock, test } from 'bun:test'

let redisClient: RedisStub | null = null

const getRedisClientMock = mock(async () => redisClient)
const closeRedisClientMock = mock(async () => {})

mock.module('../lib/redis', () => ({
  getRedisClient: getRedisClientMock,
  closeRedisClient: closeRedisClientMock,
}))

const { rateLimit, resetRateLimitStores } = await import('./ratelimit')

afterEach(async () => {
  redisClient = null
  getRedisClientMock.mockReset()
  getRedisClientMock.mockImplementation(async () => redisClient)
  await resetRateLimitStores()
})

const noop = async () => {
  /* noop */
}

const makeContext = () => ({
  req: {
    header: () => undefined,
  },
})

test('rateLimit falls back to in-memory store when Redis unavailable', async () => {
  redisClient = null

  const limiter = rateLimit({
    limit: 2,
    windowMs: 1_000,
    keyGenerator: () => 'client-memory',
  })

  const ctx = makeContext()

  await limiter(ctx as never, noop)
  await limiter(ctx as never, noop)
  await expect(limiter(ctx as never, noop)).rejects.toThrow(HTTPException)
  await resetRateLimitStores()
  await expect(limiter(ctx as never, noop)).resolves.toBeUndefined()
})

class RedisStub {
  private buckets = new Map<string, Array<{ score: number; member: string }>>()
  public deletedKeys: string[] = []

  async zremrangebyscore(key: string, min: number, max: number): Promise<void> {
    const bucket = this.buckets.get(key)
    if (!bucket) return
    this.buckets.set(
      key,
      bucket.filter(entry => entry.score < min || entry.score > max)
    )
  }

  async zcard(key: string): Promise<number> {
    return this.buckets.get(key)?.length ?? 0
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    const bucket = this.buckets.get(key) ?? []
    bucket.push({ score, member })
    this.buckets.set(key, bucket)
  }

  async expire(): Promise<void> {
    // no-op in stub
  }

  async keys(pattern: string): Promise<string[]> {
    if (pattern === 'ratelimit:*') {
      return Array.from(this.buckets.keys())
    }
    return []
  }

  async del(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.deletedKeys.push(key)
      this.buckets.delete(key)
    }
  }
}

test('rateLimit uses Redis store when available', async () => {
  const redisStub = new RedisStub()
  redisClient = redisStub

  const limiter = rateLimit({
    limit: 1,
    windowMs: 5_000,
    keyGenerator: () => 'client-redis',
  })

  const ctx = makeContext()

  await limiter(ctx as never, noop)
  await expect(limiter(ctx as never, noop)).rejects.toThrow(HTTPException)
  await resetRateLimitStores()
  expect(redisStub.deletedKeys.some(key => key.startsWith('ratelimit:'))).toBe(
    true
  )
})

test('rateLimit validates configuration inputs', async () => {
  expect(() => rateLimit({ limit: 0, windowMs: 1_000 })).toThrow()
  expect(() => rateLimit({ limit: 1, windowMs: 0 })).toThrow()
})
