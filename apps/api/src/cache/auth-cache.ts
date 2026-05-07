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
const pendingRegisterKey = (id: VerifyTokenData['verifyId']) =>
  `login:register:${id}`
const pendingRegisterIndexKey = 'login:registers'

type LoginVerificationData =
  | Omit<RegisterVerifyTokenData, 'verifyId'>
  | Omit<UpdateVerifyTokenData, 'verifyId'>

type PendingRegisterRecord = Omit<RegisterVerifyTokenData, 'verifyId'> & {
  createdAt: number
}

export type PendingRegisterVerification = RegisterVerifyTokenData & {
  createdAt: number
  expiresAt: number
}

export type PendingRegisterVerificationList = {
  total: number
  verifications: PendingRegisterVerification[]
}

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
  id: VerifyTokenData['verifyId'],
  data?: LoginVerificationData
): Promise<void> => {
  const createdAt = Date.now()
  const expiresAt = createdAt + config.loginTimeout
  await client.set(loginVerificationKey(id), '0', 'PX', config.loginTimeout)

  if (data?.kind === 'register') {
    const record: PendingRegisterRecord = {
      ...data,
      createdAt,
    }
    await client.set(
      pendingRegisterKey(id),
      JSON.stringify(record),
      'PX',
      config.loginTimeout
    )
    await client.zadd(pendingRegisterIndexKey, expiresAt, id)
  }
}

export const checkLoginVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<boolean> => {
  const result = await client.del(loginVerificationKey(id))
  if (result === 1) {
    await deletePendingRegisterVerificationMetadata(client, id)
  }
  return result === 1
}

export const createLoginVerificationWithId = async (
  client: TypedRedis,
  data: LoginVerificationData
): Promise<LoginVerification> => {
  const verifyId = crypto.randomUUID()
  await storeLoginVerification(client, verifyId, data)
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

const deletePendingRegisterVerificationMetadata = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<void> => {
  await Promise.all([
    client.del(pendingRegisterKey(id)),
    client.zrem(pendingRegisterIndexKey, id),
  ])
}

export const deletePendingRegisterVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<void> => {
  await Promise.all([
    client.del(loginVerificationKey(id)),
    deletePendingRegisterVerificationMetadata(client, id),
  ])
}

const pruneExpiredPendingRegisterVerifications = async (
  client: TypedRedis,
  now = Date.now()
): Promise<void> => {
  const expiredIds = await client.zrangebyscore(
    pendingRegisterIndexKey,
    '-inf',
    now
  )
  if (expiredIds.length === 0) return

  await Promise.all([
    client.zremrangebyscore(pendingRegisterIndexKey, '-inf', now),
    ...expiredIds.map(id => client.del(pendingRegisterKey(id))),
    ...expiredIds.map(id => client.del(loginVerificationKey(id))),
  ])
}

export const getPendingRegisterVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<PendingRegisterVerification | undefined> => {
  const [raw, ttl] = await Promise.all([
    client.get(pendingRegisterKey(id)),
    client.pttl(loginVerificationKey(id)),
  ])

  if (!raw || ttl <= 0) {
    await deletePendingRegisterVerification(client, id)
    return undefined
  }

  let parsed: PendingRegisterRecord
  try {
    parsed = JSON.parse(raw) as PendingRegisterRecord
  } catch {
    await deletePendingRegisterVerification(client, id)
    return undefined
  }

  if (parsed.kind !== 'register') {
    await deletePendingRegisterVerification(client, id)
    return undefined
  }

  return {
    ...parsed,
    verifyId: id,
    expiresAt: Date.now() + ttl,
  }
}

export const getPendingRegisterVerifications = async (
  client: TypedRedis,
  pagination: { limit: number; offset: number }
): Promise<PendingRegisterVerificationList> => {
  await pruneExpiredPendingRegisterVerifications(client)

  const [total, ids] = await Promise.all([
    client.zcard(pendingRegisterIndexKey),
    client.zrevrange(
      pendingRegisterIndexKey,
      pagination.offset,
      pagination.offset + pagination.limit - 1
    ),
  ])
  const verifications = await Promise.all(
    ids.map(id => getPendingRegisterVerification(client, id))
  )
  const filtered = verifications.filter(
    (entry): entry is PendingRegisterVerification => Boolean(entry)
  )

  return {
    total:
      filtered.length === ids.length
        ? total
        : await client.zcard(pendingRegisterIndexKey),
    verifications: filtered,
  }
}
