import type { TypedRedis } from '../cache/scripts'

export const rateLimit = async (
  redis: TypedRedis,
  key: string,
  limit: number,
  ttlMilliseconds: number
): Promise<number | undefined> => {
  const remainingTtl = await redis.rctfRateLimit(
    key,
    limit.toString(),
    ttlMilliseconds.toString()
  )

  return remainingTtl === -1 ? undefined : remainingTtl
}
