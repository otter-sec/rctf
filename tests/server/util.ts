import { config } from '@rctf/config'
import {
  challenges,
  createDatabase,
  pendingUserVerifications,
  solves,
  users,
  type ChallengeData,
  type User,
} from '@rctf/db'
import type { ResponseDefinition } from '@rctf/types'
import { expect } from 'bun:test'
import { eq } from 'drizzle-orm'
import { createToken, TokenKind } from '../../apps/api/src/lib/tokens'

// Use mocked createDatabase - it returns pglite instance
const getDb = () => createDatabase(config.database.sql).db

export const clearDatabase = async () => {
  const db = getDb()
  await db.delete(pendingUserVerifications)
  await db.delete(solves)
  await db.delete(challenges)
  await db.delete(users)
}

export const expectResponse = async <T extends ResponseDefinition<string, any>>(
  res: Response,
  expected: T
): Promise<ReturnType<Response['json']>> => {
  expect(res.status).toBe(expected.status)
  const body = await res.json()
  expect(body.kind).toBe(expected.kind)
  return body
}

export const generateTestUser = () => ({
  email: `${crypto.randomUUID()}@es3n1n.eu`,
  name: crypto.randomUUID(),
  division: Object.keys(config.divisions)[0]!,
})

export const generateAuthToken = async (userId: string) => {
  return createToken(TokenKind.Auth, userId)
}

export const generateRealTestUser = async (perms = 0) => {
  const db = getDb()
  const userData = generateTestUser()
  const id = crypto.randomUUID()

  const [user] = await db
    .insert(users)
    .values({
      id,
      ...userData,
      perms,
    })
    .returning()

  return {
    user: user!,
    cleanup: async () => {
      await db.delete(solves).where(eq(solves.userid, id))
      await db.delete(users).where(eq(users.id, id))
    },
  }
}

export const generateChallenge = async () => {
  const db = getDb()
  const id = crypto.randomUUID()
  const flag = crypto.randomUUID()

  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flag,
    tiebreakEligible: true,
    points: {
      min: 100,
      max: 500,
    },
  }

  await db.insert(challenges).values({ id, data })

  return {
    challenge: { id, ...data, flag },
    cleanup: async () => {
      await db.delete(solves).where(eq(solves.challengeid, id))
      await db.delete(challenges).where(eq(challenges.id, id))
    },
  }
}

export const generateChallengeWithReleaseTime = async (
  releaseTime: number | null | undefined
) => {
  const db = getDb()
  const id = crypto.randomUUID()
  const flag = crypto.randomUUID()

  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flag,
    tiebreakEligible: true,
    points: {
      min: 100,
      max: 500,
    },
    releaseTime,
  }

  await db.insert(challenges).values({ id, data })

  return {
    challenge: { id, ...data, flag },
    cleanup: async () => {
      await db.delete(solves).where(eq(solves.challengeid, id))
      await db.delete(challenges).where(eq(challenges.id, id))
    },
  }
}

export const getUserByEmail = async (
  email: string
): Promise<User | undefined> => {
  const db = getDb()
  return await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then(r => r[0])
}

export const deleteUserByEmail = async (email: string): Promise<void> => {
  const db = getDb()
  const user = await getUserByEmail(email)
  if (user) {
    await db.delete(solves).where(eq(solves.userid, user.id))
    await db.delete(users).where(eq(users.id, user.id))
  }
}
