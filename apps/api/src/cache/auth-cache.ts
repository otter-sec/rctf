import { config } from '@rctf/config'
import type { User } from '@rctf/db'
import {
  createToken,
  TokenKind,
  type UpdateVerifyTokenData,
  type VerifyTokenData,
} from '../lib/tokens'
import type { TypedRedis } from './scripts'

const USER_CACHE_TTL = 30_000
const LOGIN_KEY_PREFIX = 'login:'
const userCacheKey = (userId: string) => `user:${userId}`
const loginVerificationKey = (id: VerifyTokenData['verifyId']) =>
  `${LOGIN_KEY_PREFIX}${id}`

type LoginVerificationData = Omit<UpdateVerifyTokenData, 'verifyId'>

export const getCachedUser = async (
  redis: TypedRedis,
  userId: string
): Promise<User | null> => {
  const cached = await redis.get(userCacheKey(userId))
  if (!cached) {
    return null
  }

  try {
    const result = JSON.parse(cached)
    return {
      ...result,
      createdAt: result.createdAt ? new Date(result.createdAt) : undefined,
    }
  } catch {
    await redis.del(userCacheKey(userId))
    return null
  }
}

export const setCachedUser = async (
  redis: TypedRedis,
  user: User
): Promise<void> => {
  await redis.set(
    userCacheKey(user.id),
    JSON.stringify(user),
    'PX',
    USER_CACHE_TTL
  )
}

export const invalidateUserCache = async (
  redis: TypedRedis,
  userId: string
): Promise<void> => {
  await redis.del(userCacheKey(userId))
}

export const storeLoginVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<void> => {
  await client.set(loginVerificationKey(id), '0', 'PX', config.loginTimeout)
}

export const checkLoginVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<boolean> => {
  const result = await client.del(loginVerificationKey(id))
  return result === 1
}

export const hasLoginVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<boolean> => {
  return (await client.pttl(loginVerificationKey(id))) > 0
}

export const createLoginVerification = async (
  client: TypedRedis,
  data: LoginVerificationData
): Promise<string> => {
  const verifyId = crypto.randomUUID()
  await storeLoginVerification(client, verifyId)
  return await createToken(TokenKind.Verify, {
    ...data,
    verifyId,
  })
}
