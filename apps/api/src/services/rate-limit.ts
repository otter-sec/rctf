import type { RedisClient } from 'bun'

export const rateLimit = async (
  redis: RedisClient,
  key: string,
  limit: number,
  ttlMilliseconds: number
): Promise<number | undefined> => {
  const count = await redis.incr(key)

  // Define TTL if this is the first time we're incrementing the counter
  if (count === 1) {
    await redis.pexpire(key, ttlMilliseconds)
  }

  // Rate limit exceeded
  if (count > limit) {
    return await redis.pttl(key)
  }
}
