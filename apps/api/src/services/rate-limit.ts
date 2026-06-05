import type { TypedRedis } from '../cache/scripts'

const rateLimit = async (
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

// burst 5, 1 per 5s per user per challenge
export const rateLimitFlag = (
  redis: TypedRedis,
  userId: string,
  challengeId: string
) => rateLimit(redis, `rl:FLAG:${challengeId}:${userId}`, 5, 25_000)

// burst 3, 1 per 1min per user
export const rateLimitUpdateProfile = (redis: TypedRedis, userId: string) =>
  rateLimit(redis, `rl:UPDATE_PROFILE:${userId}`, 3, 180_000)

// burst 2, 1 per 1min per user
export const rateLimitUpdateAvatar = (redis: TypedRedis, userId: string) =>
  rateLimit(redis, `rl:UPDATE_AVATAR:${userId}`, 2, 120_000)

// burst 1, 1 per 10s per user per challenge
export const rateLimitAdminBot = (
  redis: TypedRedis,
  userId: string,
  challengeId: string
) => rateLimit(redis, `rl:ADMIN_BOT:${userId}:${challengeId}`, 1, 10_000)

// burst 3, 1 per 1s per IP
export const rateLimitSearch = (redis: TypedRedis, ip: string) =>
  rateLimit(redis, `rl:SEARCH:${ip}`, 3, 3000)

// burst 5, 1 per 5min per IP
export const rateLimitRecoverByIp = (redis: TypedRedis, ip: string) =>
  rateLimit(redis, `rl:RECOVER_IP:${ip}`, 5, 1_500_000)

// burst 2, 1 per 30min per email
export const rateLimitRecoverByEmail = (redis: TypedRedis, email: string) =>
  rateLimit(redis, `rl:RECOVER_EMAIL:${email}`, 2, 3_600_000)

// burst 20, 1 per 30s per IP
export const rateLimitRegisterByIp = (redis: TypedRedis, ip: string) =>
  rateLimit(redis, `rl:REGISTER_IP:${ip}`, 20, 600_000)

// burst 2, 1 per 30min per email
export const rateLimitRegisterByEmail = (redis: TypedRedis, email: string) =>
  rateLimit(redis, `rl:REGISTER_EMAIL:${email}`, 2, 3_600_000)
