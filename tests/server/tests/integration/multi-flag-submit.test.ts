import { config } from '@rctf/config'
import {
  challenges,
  createDatabase,
  solves,
  submissions,
  type ChallengeData,
} from '@rctf/db'
import {
  BadChallenge,
  BadFlag,
  GoodChallenges,
  GoodChallengesV2,
  GoodFlag,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
const getDb = () => createDatabase(config.database.sql).db

const createdUserCleanups: Array<() => Promise<void>> = []
const createdChallengeIds: string[] = []

const insertChallenge = async (
  flags: ChallengeData['flags']
): Promise<string> => {
  const db = getDb()
  const id = crypto.randomUUID()
  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flags,
    tiebreakEligible: true,
    points: { min: 100, max: 500 },
  }
  await db.insert(challenges).values({ id, data })
  createdChallengeIds.push(id)
  return id
}

const submit = async (challengeId: string, userId: string, flag: string) => {
  const authToken = await generateAuthToken(userId)
  return await request(
    app,
    `/api/v1/challs/${encodeURIComponent(challengeId)}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ flag }),
    }
  )
}

beforeAll(async () => {
  app = await getApp()
})

afterAll(async () => {
  const db = getDb()
  for (const id of createdChallengeIds) {
    await db.delete(submissions).where(eq(submissions.challengeId, id))
    await db.delete(solves).where(eq(solves.challengeid, id))
    await db.delete(challenges).where(eq(challenges.id, id))
  }
  for (const cleanup of createdUserCleanups) {
    await cleanup()
  }
})

describe('multi-flag submission', () => {
  test('either of two static flags solves the challenge', async () => {
    const challengeId = await insertChallenge([
      { provider: 'flags/static', config: { flag: 'flag{first}' } },
      { provider: 'flags/static', config: { flag: 'flag{second}' } },
    ])

    const first = await generateRealTestUser()
    createdUserCleanups.push(first.cleanup)
    const second = await generateRealTestUser()
    createdUserCleanups.push(second.cleanup)

    await expectResponse(
      await submit(challengeId, first.user.id, 'flag{first}'),
      GoodFlag
    )
    await expectResponse(
      await submit(challengeId, second.user.id, 'flag{second}'),
      GoodFlag
    )
  })

  test('a wrong flag is rejected and audited', async () => {
    const challengeId = await insertChallenge([
      { provider: 'flags/static', config: { flag: 'flag{first}' } },
      { provider: 'flags/static', config: { flag: 'flag{second}' } },
    ])

    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)

    await expectResponse(
      await submit(challengeId, user.id, 'flag{third}'),
      BadFlag
    )

    const db = getDb()
    const rows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.challengeId, challengeId))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.details).toEqual({ submittedFlag: 'flag{third}' })
  })

  test('a correct submission records the matched entry', async () => {
    const challengeId = await insertChallenge([
      { provider: 'flags/static', config: { flag: 'flag{first}' } },
      { provider: 'flags/static', config: { flag: 'flag{second}' } },
    ])

    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)

    await expectResponse(
      await submit(challengeId, user.id, 'flag{second}'),
      GoodFlag
    )

    const db = getDb()
    const rows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.challengeId, challengeId))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.details).toEqual({
      submittedFlag: 'flag{second}',
      matchedFlagIndex: 1,
      matchedFlagProvider: 'flags/static',
    })
  })

  test('a challenge without flag entries rejects submissions', async () => {
    const challengeId = await insertChallenge([])

    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)

    await expectResponse(
      await submit(challengeId, user.id, 'flag{anything}'),
      BadChallenge
    )
  })

  test('v2 challenge list exposes hasFlag but never the entries', async () => {
    const withFlags = await insertChallenge([
      { provider: 'flags/static', config: { flag: 'flag{secret}' } },
    ])
    const withoutFlags = await insertChallenge([])

    const { user, cleanup } = await generateRealTestUser()
    createdUserCleanups.push(cleanup)
    const authToken = await generateAuthToken(user.id)

    const res = await request(app, '/api/v2/challs', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    const body = await expectResponse(res, GoodChallengesV2)

    const flagged = body.data.find((c: any) => c.id === withFlags)
    const unflagged = body.data.find((c: any) => c.id === withoutFlags)
    expect(flagged?.hasFlag).toBe(true)
    expect(unflagged?.hasFlag).toBe(false)
    expect(flagged).not.toHaveProperty('flags')
    expect(flagged).not.toHaveProperty('flag')
    expect(JSON.stringify(body)).not.toContain('flag{secret}')
  })

  test('v1 challenge list never leaks flag entries', async () => {
    const challengeId = await insertChallenge([
      { provider: 'flags/static', config: { flag: 'flag{secret-v1}' } },
    ])

    const res = await request(app, '/api/v1/challs')
    const body = await expectResponse(res, GoodChallenges)

    const found = body.data.find((c: any) => c.id === challengeId)
    expect(found).toBeDefined()
    expect(found).not.toHaveProperty('flags')
    expect(found).not.toHaveProperty('flag')
    expect(JSON.stringify(body)).not.toContain('flag{secret-v1}')
  })
})
