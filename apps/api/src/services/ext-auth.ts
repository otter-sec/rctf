import type { DatabaseClient } from '@rctf/db'
import { extAuthClients } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { asc, eq } from 'drizzle-orm'
import type { TypedRedis } from '../cache/scripts'

const CODE_TTL_MS = 60_000
const codeKey = (code: string) => `ext-auth:code:${code}`

const randomB64Url = (bytes: number): string =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export type ExtAuthClientPublic = {
  id: string
  name: string
  redirectUri: string
}

export type ExtAuthClientAdmin = ExtAuthClientPublic & {
  createdAt: string
  createdBy: string | null
}

export const createExtAuthClient = async (
  db: DatabaseClient,
  params: { name: string; redirectUri: string; createdBy: string }
): Promise<{ client: ExtAuthClientAdmin; secret: string }> => {
  const id = crypto.randomUUID()
  const secret = randomB64Url(32)
  const secretHash = await Bun.password.hash(secret)
  const [row] = await db
    .insert(extAuthClients)
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

export const getExtAuthClientPublic = async (
  db: DatabaseClient,
  id: string
): Promise<ExtAuthClientPublic | undefined> => {
  const row = await db
    .select({
      id: extAuthClients.id,
      name: extAuthClients.name,
      redirectUri: extAuthClients.redirectUri,
    })
    .from(extAuthClients)
    .where(eq(extAuthClients.id, id))
    .limit(1)
    .then(takeUnique)
  return row
}

export const verifyExtAuthClientSecret = async (
  db: DatabaseClient,
  id: string,
  secret: string
): Promise<boolean> => {
  const row = await db
    .select({ secretHash: extAuthClients.secretHash })
    .from(extAuthClients)
    .where(eq(extAuthClients.id, id))
    .limit(1)
    .then(takeUnique)
  if (!row) {
    return false
  }
  return await Bun.password.verify(secret, row.secretHash)
}

export const listExtAuthClients = async (
  db: DatabaseClient
): Promise<ExtAuthClientAdmin[]> => {
  const rows = await db
    .select({
      id: extAuthClients.id,
      name: extAuthClients.name,
      redirectUri: extAuthClients.redirectUri,
      createdAt: extAuthClients.createdAt,
      createdBy: extAuthClients.createdBy,
    })
    .from(extAuthClients)
    .orderBy(asc(extAuthClients.createdAt))
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    redirectUri: r.redirectUri,
    createdAt: r.createdAt!,
    createdBy: r.createdBy ?? null,
  }))
}

export const deleteExtAuthClient = async (
  db: DatabaseClient,
  id: string
): Promise<boolean> => {
  const deleted = await db
    .delete(extAuthClients)
    .where(eq(extAuthClients.id, id))
    .returning({ id: extAuthClients.id })
  return deleted.length > 0
}

export type ExtAuthCodePayload = {
  userId: string
  clientId: string
}

export const issueExtAuthCode = async (
  redis: TypedRedis,
  payload: ExtAuthCodePayload
): Promise<string> => {
  const code = randomB64Url(32)
  await redis.set(codeKey(code), JSON.stringify(payload), 'PX', CODE_TTL_MS)
  return code
}

export const consumeExtAuthCode = async (
  redis: TypedRedis,
  code: string
): Promise<ExtAuthCodePayload | undefined> => {
  const raw = await redis.getdel(codeKey(code))
  if (!raw) {
    return undefined
  }
  try {
    return JSON.parse(raw) as ExtAuthCodePayload
  } catch {
    return undefined
  }
}
