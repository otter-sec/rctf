import { config } from '@rctf/config'
import { challenges, createDatabase, submissionLogs, users } from '@rctf/db'
import {
  BadBody,
  BadFlag,
  BadPerms,
  GoodAdminSubmissionLogs,
  GoodFlag,
  Permissions,
  SubmissionLogKind,
  SubmissionLogResult,
} from '@rctf/types'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  clearDatabase,
  expectResponse,
  generateAuthToken,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
const getDb = () => createDatabase(config.database.sql).db

beforeAll(async () => {
  app = await getApp()
})

beforeEach(async () => {
  await clearDatabase()
})

describe('admin submission logs', () => {
  test('records flag submission IPs and returns them sortable by team', async () => {
    const db = getDb()
    const admin = await generateRealTestUser(
      Permissions.usersWrite | Permissions.challsRead
    )
    const alpha = await generateRealTestUser()
    const beta = await generateRealTestUser()
    const alphaChallenge = await generateChallenge()
    const betaChallenge = await generateChallenge()
    const { id: _alphaChallengeId, ...alphaChallengeData } =
      alphaChallenge.challenge
    const { id: _betaChallengeId, ...betaChallengeData } =
      betaChallenge.challenge

    await db
      .update(users)
      .set({ name: 'Alpha Team' })
      .where(eq(users.id, alpha.user.id))
    await db
      .update(users)
      .set({ name: 'Beta Team' })
      .where(eq(users.id, beta.user.id))
    await db
      .update(challenges)
      .set({
        data: {
          ...alphaChallengeData,
          name: 'Alpha Challenge',
        },
      })
      .where(eq(challenges.id, alphaChallenge.challenge.id))
    await db
      .update(challenges)
      .set({
        data: {
          ...betaChallengeData,
          name: 'Beta Challenge',
        },
      })
      .where(eq(challenges.id, betaChallenge.challenge.id))

    const alphaToken = await generateAuthToken(alpha.user.id)
    const betaToken = await generateAuthToken(beta.user.id)

    const goodRes = await request(
      app,
      `/api/v1/challs/${alphaChallenge.challenge.id}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${alphaToken}`,
        },
        body: JSON.stringify({ flag: alphaChallenge.challenge.flag }),
      }
    )
    await expectResponse(goodRes, GoodFlag)

    const badRes = await request(
      app,
      `/api/v1/challs/${betaChallenge.challenge.id}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${betaToken}`,
        },
        body: JSON.stringify({ flag: 'wrong' }),
      }
    )
    await expectResponse(badRes, BadFlag)

    const storedLogs = await db.select().from(submissionLogs)
    expect(storedLogs).toHaveLength(2)
    expect(storedLogs.every(log => log.ip === '127.0.0.1')).toBe(true)
    expect(storedLogs.map(log => log.details)).toContainEqual({
      submittedFlag: alphaChallenge.challenge.flag,
    })
    expect(storedLogs.map(log => log.details)).toContainEqual({
      submittedFlag: 'wrong',
    })

    const res = await request(
      app,
      '/api/v2/admin/submission-logs?limit=100&offset=0&sortBy=team&sortOrder=asc',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, GoodAdminSubmissionLogs)
    expect(body.data.total).toBe(2)
    expect(body.data.logs.map((log: any) => log.userName)).toEqual([
      'Alpha Team',
      'Beta Team',
    ])
    expect(body.data.logs[0]).toMatchObject({
      kind: SubmissionLogKind.FLAG,
      result: SubmissionLogResult.CORRECT,
      challengeName: 'Alpha Challenge',
      ip: '127.0.0.1',
      details: {
        submittedFlag: alphaChallenge.challenge.flag,
      },
    })
    expect(body.data.logs[1]).toMatchObject({
      kind: SubmissionLogKind.FLAG,
      result: SubmissionLogResult.INCORRECT,
      challengeName: 'Beta Challenge',
      ip: '127.0.0.1',
      details: {
        submittedFlag: 'wrong',
      },
    })
  })

  test('requires team and challenge admin permissions', async () => {
    const admin = await generateRealTestUser(Permissions.challsRead)

    const res = await request(
      app,
      '/api/v2/admin/submission-logs?limit=10&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    await expectResponse(res, BadPerms)
  })

  test('rejects invalid result filters', async () => {
    const admin = await generateRealTestUser(
      Permissions.usersWrite | Permissions.challsRead
    )

    const res = await request(
      app,
      '/api/v2/admin/submission-logs?limit=10&offset=0&results=correct,nope',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, BadBody)
    expect(body.data.reason).toBe(
      'query:results: invalid submission log result'
    )
  })
})
