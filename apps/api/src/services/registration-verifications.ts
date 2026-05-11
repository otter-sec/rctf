import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import { pendingUserVerifications } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { and, desc, eq, gt, sql, type SQL } from 'drizzle-orm'

export type PendingRegistrationVerification =
  typeof pendingUserVerifications.$inferSelect

type PendingRegistrationInput = {
  name: string
  email: string
  division: string
}

const table = pendingUserVerifications
const notExpired = gt(table.expiresAt, sql`now()`)

const newToken = () =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')

const findActive = (db: DatabaseClient, where: SQL) =>
  db
    .select()
    .from(table)
    .where(and(where, notExpired))
    .limit(1)
    .then(takeUnique)

export const createPendingRegistrationVerification = async (
  db: DatabaseClient,
  input: PendingRegistrationInput
): Promise<PendingRegistrationVerification> => {
  const row = {
    id: crypto.randomUUID(),
    token: newToken(),
    ...input,
    email: input.email.toLowerCase(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + config.loginTimeout).toISOString(),
  }

  const result = await db
    .insert(table)
    .values(row)
    .onConflictDoUpdate({ target: table.email, set: row })
    .returning()
    .then(takeUnique)

  return result!
}

export const getPendingRegistrationVerification = (
  db: DatabaseClient,
  id: string
) => findActive(db, eq(table.id, id))

export const getPendingRegistrationVerificationByToken = (
  db: DatabaseClient,
  token: string
) => findActive(db, eq(table.token, token))

export const claimPendingRegistrationVerificationByToken = (
  db: DatabaseClient,
  token: string
): Promise<PendingRegistrationVerification | undefined> =>
  db
    .delete(table)
    .where(and(eq(table.token, token), notExpired))
    .returning()
    .then(takeUnique)

export const getPendingRegistrationVerifications = async (
  db: DatabaseClient
): Promise<PendingRegistrationVerification[]> => {
  await db.delete(table).where(sql`${table.expiresAt} <= now()`)
  return db
    .select()
    .from(table)
    .where(notExpired)
    .orderBy(desc(table.createdAt))
}

export const deletePendingRegistrationVerification = async (
  db: DatabaseClient,
  id: string
): Promise<void> => {
  await db.delete(table).where(eq(table.id, id))
}
