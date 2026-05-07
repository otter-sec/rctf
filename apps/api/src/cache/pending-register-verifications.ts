import { config } from '@rctf/config'
import type { RegisterVerifyTokenData, VerifyTokenData } from '../lib/tokens'
import {
  createLoginVerificationWithId,
  deleteLoginVerification,
  getLoginVerificationTtl,
  type LoginVerification,
} from './auth-cache'
import type { TypedRedis } from './scripts'

type PendingRegisterInput = Omit<RegisterVerifyTokenData, 'verifyId'>

type PendingRegisterRecord = PendingRegisterInput & {
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

const pendingRegisterKey = (id: VerifyTokenData['verifyId']) =>
  `login:register:${id}`
const pendingRegisterIndexKey = 'login:registers'

const storePendingRegisterVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId'],
  data: PendingRegisterInput
): Promise<void> => {
  const createdAt = Date.now()
  const expiresAt = createdAt + config.loginTimeout
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
  await client.pexpire(pendingRegisterIndexKey, config.loginTimeout)
}

export const createPendingRegisterVerification = async (
  client: TypedRedis,
  data: PendingRegisterInput
): Promise<LoginVerification> => {
  const verification = await createLoginVerificationWithId(client, data)

  try {
    await storePendingRegisterVerification(client, verification.id, data)
  } catch (error) {
    await deleteLoginVerification(client, verification.id)
    throw error
  }

  return verification
}

export const deletePendingRegisterVerificationMetadata = async (
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
    deleteLoginVerification(client, id),
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
    ...expiredIds.map(id => deleteLoginVerification(client, id)),
  ])
}

export const getPendingRegisterVerification = async (
  client: TypedRedis,
  id: VerifyTokenData['verifyId']
): Promise<PendingRegisterVerification | undefined> => {
  const [raw, ttl] = await Promise.all([
    client.get(pendingRegisterKey(id)),
    getLoginVerificationTtl(client, id),
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
