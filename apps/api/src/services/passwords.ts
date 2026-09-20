import type { DatabaseClient } from '@rctf/db'
import { users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { desc, eq, or, sql } from 'drizzle-orm'
import { invalidateUserCache } from '../cache/auth-cache'
import type { TypedRedis } from '../cache/scripts'
import { createAuthTokenAt, timeNow, type Token } from '../lib/tokens'

// OWASP Password Storage Cheat Sheet baseline for argon2id. Pinned rather than
// left to the Bun default so a real check and the dummy check below cost the
// same.
const ARGON2_PARAMS = {
  algorithm: 'argon2id',
  memoryCost: 19456,
  timeCost: 2,
} as const

// argon2id is deliberately expensive and the API is a single Bun process, so
// cap concurrency. The slot is handed straight to the next waiter; releasing
// it would let a new caller take it while that waiter is still a queued
// microtask, drifting the count above the cap.
const MAX_CONCURRENT_HASHES = 4

let active = 0
const waiting: (() => void)[] = []

const withLimit = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (active < MAX_CONCURRENT_HASHES) {
    active++
  } else {
    await new Promise<void>(resolve => waiting.push(resolve))
  }

  try {
    return await fn()
  } finally {
    const next = waiting.shift()
    if (next) {
      next()
    } else {
      active--
    }
  }
}

export const hashPassword = async (password: string): Promise<string> =>
  await withLimit(() => Bun.password.hash(password, ARGON2_PARAMS))

// Checked when the identifier is unknown and when the account has no password,
// so neither answers faster than a real check and leaks which teams exist or
// which of them use a password.
const DUMMY_HASH = await Bun.password.hash(crypto.randomUUID(), ARGON2_PARAMS)

export const checkPassword = async (
  password: string,
  hash: string | null | undefined
): Promise<boolean> => {
  const matches = await withLimit(() =>
    Bun.password.verify(password, hash ?? DUMMY_HASH)
  )
  return hash ? matches : false
}

type UserCredentials = {
  id: string
  passwordHash: string | null
  tokenEpoch: number
}

// Never read through getUser: the hash must not reach the User type or the
// Redis user cache.
const credentialColumns = {
  id: users.id,
  passwordHash: users.passwordHash,
  tokenEpoch: users.tokenEpoch,
}

// One string can name two rows: names may contain '@', and the columns are
// unique only within themselves. The ORDER BY puts the account that holds the
// address first, so a team named after someone else's email cannot shadow it.
//
// IS NOT DISTINCT FROM, not `=`: email is nullable, and DESC is NULLS FIRST,
// so `=` would sort the rows without an email ahead of the one that matched.
//
// Three separate bindings on purpose. Collapsed to one, Postgres infers text
// from the email comparison and casts away the citext name index.
export const getUserCredentialsByIdentifier = async (
  db: DatabaseClient,
  identifier: string
): Promise<UserCredentials | undefined> =>
  await db
    .select(credentialColumns)
    .from(users)
    .where(or(eq(users.email, identifier), eq(users.name, identifier)))
    .orderBy(desc(sql`${users.email} IS NOT DISTINCT FROM ${identifier}`))
    .limit(1)
    .then(takeUnique)

export const getUserCredentialsById = async (
  db: DatabaseClient,
  id: string
): Promise<UserCredentials | undefined> =>
  await db
    .select(credentialColumns)
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .then(takeUnique)

export const setUserPassword = async (
  db: DatabaseClient,
  redis: TypedRedis,
  userId: string,
  passwordHash: string | null
): Promise<Token | undefined> => {
  const epoch = timeNow()

  const updated = await db
    .update(users)
    .set({ passwordHash, tokenEpoch: epoch })
    .where(eq(users.id, userId))
    .returning({ id: users.id })
    .then(takeUnique)

  if (!updated) {
    return undefined
  }

  await invalidateUserCache(redis, userId)
  // One second ahead of the epoch it just set, or isTokenRevoked's `<=` would
  // reject the replacement it is handing back.
  return await createAuthTokenAt(userId, epoch + 1)
}
