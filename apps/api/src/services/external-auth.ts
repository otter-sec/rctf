import type { DatabaseClient } from '@rctf/db'
import { externalAuthClients } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { asc, eq } from 'drizzle-orm'
import type { TypedRedis } from '../cache/scripts'

const CODE_TTL_MS = 60_000
const codeKey = (code: string) => `external-auth:code:${code}`

const randomB64Url = (bytes: number): string =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export type ExternalAuthClientPublic = {
  id: string
  name: string
  redirectUri: string
}

export type ExternalAuthClientAdmin = ExternalAuthClientPublic & {
  createdAt: string
  createdBy: string | null
}

export const createExternalAuthClient = async (
  db: DatabaseClient,
  params: { name: string; redirectUri: string; createdBy: string }
): Promise<{ client: ExternalAuthClientAdmin; secret: string }> => {
  const id = crypto.randomUUID()
  const secret = randomB64Url(32)
  const secretHash = await Bun.password.hash(secret)
  const [row] = await db
    .insert(externalAuthClients)
    .values({
      id,
      name: params.name,
      redirectUri: params.redirectUri,
      secretHash,
      createdBy: params.createdBy,
    })
    .returning()
  return {
    client: {
      id: row!.id,
      name: row!.name,
      redirectUri: row!.redirectUri,
      createdAt: row!.createdAt!,
      createdBy: row!.createdBy ?? null,
    },
    secret,
  }
}

export const getExternalAuthClientPublic = async (
  db: DatabaseClient,
  id: string
): Promise<ExternalAuthClientPublic | undefined> => {
  const row = await db
    .select({
      id: externalAuthClients.id,
      name: externalAuthClients.name,
      redirectUri: externalAuthClients.redirectUri,
    })
    .from(externalAuthClients)
    .where(eq(externalAuthClients.id, id))
    .limit(1)
    .then(takeUnique)
  return row
}

export const verifyExternalAuthClientSecret = async (
  db: DatabaseClient,
  id: string,
  secret: string
): Promise<boolean> => {
  const row = await db
    .select({ secretHash: externalAuthClients.secretHash })
    .from(externalAuthClients)
    .where(eq(externalAuthClients.id, id))
    .limit(1)
    .then(takeUnique)
  if (!row) {
    return false
  }
  return await Bun.password.verify(secret, row.secretHash)
}

export const listExternalAuthClients = async (
  db: DatabaseClient
): Promise<ExternalAuthClientAdmin[]> => {
  const rows = await db
    .select({
      id: externalAuthClients.id,
      name: externalAuthClients.name,
      redirectUri: externalAuthClients.redirectUri,
      createdAt: externalAuthClients.createdAt,
      createdBy: externalAuthClients.createdBy,
    })
    .from(externalAuthClients)
    .orderBy(asc(externalAuthClients.createdAt))
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    redirectUri: r.redirectUri,
    createdAt: r.createdAt!,
    createdBy: r.createdBy ?? null,
  }))
}

export const deleteExternalAuthClient = async (
  db: DatabaseClient,
  id: string
): Promise<boolean> => {
  const deleted = await db
    .delete(externalAuthClients)
    .where(eq(externalAuthClients.id, id))
    .returning({ id: externalAuthClients.id })
  return deleted.length > 0
}

export type ExternalAuthCodePayload = {
  userId: string
  clientId: string
}

export const issueExternalAuthCode = async (
  redis: TypedRedis,
  payload: ExternalAuthCodePayload
): Promise<string> => {
  const code = randomB64Url(32)
  await redis.set(codeKey(code), JSON.stringify(payload), 'PX', CODE_TTL_MS)
  return code
}

export const consumeExternalAuthCode = async (
  redis: TypedRedis,
  code: string
): Promise<ExternalAuthCodePayload | undefined> => {
  const raw = await redis.getdel(codeKey(code))
  if (!raw) {
    return undefined
  }
  try {
    return JSON.parse(raw) as ExternalAuthCodePayload
  } catch {
    return undefined
  }
}
