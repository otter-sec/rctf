import { config } from '@rctf/config'
import type { User } from '@rctf/db'
import {
  createToken,
  TokenKind,
  type RegisterVerifyTokenData,
  type UpdateVerifyTokenData,
  type VerifyTokenData,
} from '../lib/tokens'
import type { TypedRedis } from './scripts'

const USER_CACHE_TTL = 30_000
const userCacheKey = (userId: string) => `user:${userId}`
const loginVerificationKey = (id: VerifyTokenData['verifyId']) => `login:${id}`

type LoginVerificationData =
  | Omit<RegisterVerifyTokenData, 'verifyId'>
  | Omit<UpdateVerifyTokenData, 'verifyId'>

export type LoginVerification = {
  id: VerifyTokenData['verifyId']
  token: string
}

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

export const deleteLoginVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<void> => {
  await client.del(loginVerificationKey(id))
}

export const getLoginVerificationTtl = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<number> => {
  return await client.pttl(loginVerificationKey(id))
}

export const createLoginVerificationWithId = async (
  client: TypedRedis,
  data: LoginVerificationData
): Promise<LoginVerification> => {
  const verifyId = crypto.randomUUID()
  await storeLoginVerification(client, verifyId)
  const token = await createToken(TokenKind.Verify, {
    ...data,
    verifyId,
  })

  return {
    id: verifyId,
    token,
  }
}

export const createLoginVerification = async (
  client: TypedRedis,
  data: LoginVerificationData
): Promise<string> => {
  const verification = await createLoginVerificationWithId(client, data)
  return verification.token
}
