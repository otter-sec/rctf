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
    // Entries written by an older build can be missing fields this one relies
    // on; tokenEpoch in particular would read as undefined and turn every
    // revocation check into a no-op. Treat any unexpected shape as a miss.
    if (typeof result?.tokenEpoch !== 'number') {
      await redis.del(userCacheKey(userId))
      return null
    }
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
  // userColumns is what keeps the hash out of a User; this is a backstop for
  // a query that forgot to project.
  const { passwordHash: _passwordHash, ...safe } = user as User & {
    passwordHash?: unknown
  }

  await redis.set(
    userCacheKey(user.id),
    JSON.stringify(safe),
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
