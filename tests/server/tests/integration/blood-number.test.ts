import { config } from '@rctf/config'
import { createDatabase, solves, users } from '@rctf/db'
import { afterAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { createSolveAndGetBloodNumber } from '../../../../apps/api/src/services/challenges'
import { generateChallenge, generateRealTestUser } from '../../util'

const cleanups: Array<() => Promise<void>> = []

afterAll(async () => {
  for (const cleanup of cleanups) {
    await cleanup()
  }
})

describe('blood number generation', () => {
  test('returns 1-based blood numbers for newly inserted solves', async () => {
    const db = createDatabase(config.database.sql).db

    const { user: user1, cleanup: c1 } = await generateRealTestUser()
    const { user: user2, cleanup: c2 } = await generateRealTestUser()
    const { challenge, cleanup: cc } = await generateChallenge()
    cleanups.push(c1, c2, cc)

    const firstBloodNumber = await createSolveAndGetBloodNumber(db, {
      challengeId: challenge.id,
      userId: user1.id,
    })
    const secondBloodNumber = await createSolveAndGetBloodNumber(db, {
      challengeId: challenge.id,
      userId: user2.id,
    })

    expect(firstBloodNumber).toBe(1)
    expect(secondBloodNumber).toBe(2)
  })

  test('ignores banned user solves when assigning blood numbers', async () => {
    const db = createDatabase(config.database.sql).db

    const { user: bannedUser, cleanup: c1 } = await generateRealTestUser()
    const { user: activeUser, cleanup: c2 } = await generateRealTestUser()
    const { challenge, cleanup: cc } = await generateChallenge()
    cleanups.push(c1, c2, cc)

    await db
      .update(users)
      .set({ banned: true })
      .where(eq(users.id, bannedUser.id))
    await db.insert(solves).values({
      id: crypto.randomUUID(),
      challengeid: challenge.id,
      userid: bannedUser.id,
      createdat: new Date(Date.now() - 10000).toISOString(),
    })

    const bloodNumber = await createSolveAndGetBloodNumber(db, {
      challengeId: challenge.id,
      userId: activeUser.id,
    })

    expect(bloodNumber).toBe(1)
  })
})
