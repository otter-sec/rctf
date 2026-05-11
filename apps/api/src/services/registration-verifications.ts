import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import { pendingUserVerifications } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { and, desc, eq, gt, sql } from 'drizzle-orm'

export type PendingRegistrationVerification =
  typeof pendingUserVerifications.$inferSelect

type PendingRegistrationInput = {
  name: string
  email: string
  division: string
}

const activeVerificationFilter = () =>
  gt(pendingUserVerifications.expiresAt, sql`now()`)

const expiresAt = () => new Date(Date.now() + config.loginTimeout).toISOString()

const createRegistrationToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Buffer.from(bytes).toString('base64url')
}

export const createPendingRegistrationVerification = async (
  db: DatabaseClient,
  input: PendingRegistrationInput
): Promise<PendingRegistrationVerification> => {
  const now = new Date().toISOString()
  const verification = {
    id: crypto.randomUUID(),
    token: createRegistrationToken(),
    ...input,
    createdAt: now,
    expiresAt: expiresAt(),
  }

  return await db
    .insert(pendingUserVerifications)
    .values(verification)
    .onConflictDoUpdate({
      target: pendingUserVerifications.email,
      set: verification,
    })
    .returning()
    .then(takeUnique)
    .then(row => row!)
}

export const getPendingRegistrationVerification = async (
  db: DatabaseClient,
  id: string
): Promise<PendingRegistrationVerification | undefined> => {
  return await db
    .select()
    .from(pendingUserVerifications)
    .where(and(eq(pendingUserVerifications.id, id), activeVerificationFilter()))
    .limit(1)
    .then(takeUnique)
}

export const getPendingRegistrationVerificationByToken = async (
  db: DatabaseClient,
  token: string
): Promise<PendingRegistrationVerification | undefined> => {
  return await db
    .select()
    .from(pendingUserVerifications)
    .where(
      and(eq(pendingUserVerifications.token, token), activeVerificationFilter())
    )
    .limit(1)
    .then(takeUnique)
}

export const getPendingRegistrationVerifications = async (
  db: DatabaseClient
): Promise<PendingRegistrationVerification[]> => {
  await db
    .delete(pendingUserVerifications)
    .where(sql`${pendingUserVerifications.expiresAt} <= now()`)

  return await db
    .select()
    .from(pendingUserVerifications)
    .where(activeVerificationFilter())
    .orderBy(desc(pendingUserVerifications.createdAt))
}

export const deletePendingRegistrationVerification = async (
  db: DatabaseClient,
  id: string
): Promise<void> => {
  await db
    .delete(pendingUserVerifications)
    .where(eq(pendingUserVerifications.id, id))
}
