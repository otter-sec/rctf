import { config } from '@rctf/config'
import { challenges, createDatabase, solves, submissions } from '@rctf/db'
import type { ChallengeData } from '@rctf/db'
import {
  BadFlag,
  GoodAdminChallengeV2,
  GoodChallengeUpdateV2,
  GoodFlag,
  Permissions,
} from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { generateDynamicFlag } from '../../../../apps/api/src/providers/flags'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateRealTestUser,
} from '../../util'

const DYNAMIC_BASE = 'rctf{abcdefghijklmnopqrstuvwxyz}'
const DYNAMIC_MODE = 'basic'
const signingKey = config.dynamicFlagSigningKey ?? ''

const getDb = () => createDatabase(config.database.sql).db

let app: Hono<any>
const challengeCleanups: Array<() => Promise<void>> = []
const userCleanups: Array<() => Promise<void>> = []

// Inserts a dynamic-flag challenge straight into the DB. The base flag lives in
// `flags.dynamic`; the flat `flag` stays empty, mirroring how a real dynamic
// challenge is stored.
const createDynamicChallenge = async () => {
  const db = getDb()
  const id = crypto.randomUUID()
  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flag: '',
    flags: { dynamic: { base: DYNAMIC_BASE, mode: DYNAMIC_MODE } },
    tiebreakEligible: true,
    points: { min: 100, max: 500 },
  }
  await db.insert(challenges).values({ id, data })
  challengeCleanups.push(async () => {
    await db.delete(submissions).where(eq(submissions.challengeId, id))
    await db.delete(solves).where(eq(solves.challengeid, id))
    await db.delete(challenges).where(eq(challenges.id, id))
  })
  return id
}

const newUser = async (perms = 0) => {
  const { user, cleanup } = await generateRealTestUser(perms)
  userCleanups.push(cleanup)
  return user
}

const submit = async (challengeId: string, userId: string, flag: string) => {
  const authToken = await generateAuthToken(userId)
  return request(
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
  for (const cleanup of challengeCleanups) await cleanup()
  for (const cleanup of userCleanups) await cleanup()
})

describe('dynamic flag submission', () => {
  test('accepts the flag minted for the submitting team', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()
    const flag = generateDynamicFlag(
      DYNAMIC_BASE,
      user.id,
      challengeId,
      DYNAMIC_MODE,
      signingKey
    )

    const res = await submit(challengeId, user.id, flag)
    await expectResponse(res, GoodFlag)
  })

  test("rejects another team's dynamic flag (anti-sharing)", async () => {
    const challengeId = await createDynamicChallenge()
    const owner = await newUser()
    const thief = await newUser()

    // Flag minted for `owner`, submitted by `thief`.
    const ownerFlag = generateDynamicFlag(
      DYNAMIC_BASE,
      owner.id,
      challengeId,
      DYNAMIC_MODE,
      signingKey
    )

    const res = await submit(challengeId, thief.id, ownerFlag)
    await expectResponse(res, BadFlag)

    // No solve should have been recorded for the thief.
    const thiefSolves = await getDb()
      .select()
      .from(solves)
      .where(eq(solves.userid, thief.id))
    expect(thiefSolves).toHaveLength(0)

    // ...and the attempt is recorded distinctly as a flag-sharing signal.
    const thiefSubmissions = await getDb()
      .select()
      .from(submissions)
      .where(eq(submissions.userId, thief.id))
    expect(thiefSubmissions).toHaveLength(1)
    expect(thiefSubmissions[0]!.details).toMatchObject({
      dynamicFlagSharing: true,
    })
  })

  test('rejects the untransformed base flag', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()

    const res = await submit(challengeId, user.id, DYNAMIC_BASE)
    await expectResponse(res, BadFlag)
  })

  test('an ordinary wrong guess is not flagged as sharing', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()

    const res = await submit(
      challengeId,
      user.id,
      'rctf{totally-different-body}'
    )
    await expectResponse(res, BadFlag)

    const userSubmissions = await getDb()
      .select()
      .from(submissions)
      .where(eq(submissions.userId, user.id))
    expect(userSubmissions).toHaveLength(1)
    expect(userSubmissions[0]!.details.dynamicFlagSharing).toBeUndefined()
  })

  test('lists a dynamic challenge as having a flag', async () => {
    const challengeId = await createDynamicChallenge()
    const user = await newUser()
    const authToken = await generateAuthToken(user.id)

    const res = await request(app, '/api/v2/challs', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    const item = body.data.find((c: { id: string }) => c.id === challengeId)
    expect(item).toBeDefined()
    expect(item.hasFlag).toBe(true)
  })
})

describe('admin dynamic flag configuration', () => {
  const adminPerms = Permissions.challsRead | Permissions.challsWrite

  test('persists and reads back flags.dynamic, and clears it', async () => {
    const admin = await newUser(adminPerms)
    const authToken = await generateAuthToken(admin.id)
    const challengeId = crypto.randomUUID()

    const db = getDb()
    challengeCleanups.push(async () => {
      await db.delete(solves).where(eq(solves.challengeid, challengeId))
      await db.delete(challenges).where(eq(challenges.id, challengeId))
    })

    // Create with a dynamic flag config.
    let res = await request(app, `/api/v2/admin/challs/${challengeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        data: {
          name: 'Dynamic Challenge',
          description: 'desc',
          category: 'misc',
          author: 'tester',
          flag: '',
          flags: { dynamic: { base: DYNAMIC_BASE, mode: DYNAMIC_MODE } },
          points: { min: 100, max: 500 },
        },
      }),
    })
    let body = await expectResponse(res, GoodChallengeUpdateV2)
    expect(body.data.flags.dynamic.base).toBe(DYNAMIC_BASE)
    expect(body.data.flags.dynamic.mode).toBe(DYNAMIC_MODE)

    // Read it back through the admin GET route.
    res = await request(app, `/api/v2/admin/challs/${challengeId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    body = await expectResponse(res, GoodAdminChallengeV2)
    expect(body.data.flags.dynamic.base).toBe(DYNAMIC_BASE)

    // Clearing it with an empty flags object drops the dynamic config.
    res = await request(app, `/api/v2/admin/challs/${challengeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: { flags: {} } }),
    })
    body = await expectResponse(res, GoodChallengeUpdateV2)
    expect(body.data.flags?.dynamic).toBeUndefined()
  })
})
