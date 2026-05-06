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
  SubmissionLogTeamStatus,
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
    const divisions = Object.keys(config.divisions)
    const alphaDivision = divisions[0]!
    const betaDivision = divisions[1] ?? alphaDivision
    const { id: _alphaChallengeId, ...alphaChallengeData } =
      alphaChallenge.challenge
    const { id: _betaChallengeId, ...betaChallengeData } =
      betaChallenge.challenge

    await db
      .update(users)
      .set({ name: 'Alpha Team', division: alphaDivision })
      .where(eq(users.id, alpha.user.id))
    await db
      .update(users)
      .set({ name: 'Beta Team', division: betaDivision })
      .where(eq(users.id, beta.user.id))
    await db
      .update(challenges)
      .set({
        data: {
          ...alphaChallengeData,
          name: 'Alpha Challenge',
          category: 'web',
        },
      })
      .where(eq(challenges.id, alphaChallenge.challenge.id))
    await db
      .update(challenges)
      .set({
        data: {
          ...betaChallengeData,
          name: 'Beta Challenge',
          category: 'crypto',
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

    await db
      .update(users)
      .set({ banned: true })
      .where(eq(users.id, beta.user.id))
    await db
      .update(submissionLogs)
      .set({ createdAt: '2026-05-05T10:00:00.000Z' })
      .where(eq(submissionLogs.userId, alpha.user.id))
    await db
      .update(submissionLogs)
      .set({ createdAt: '2026-05-05T11:00:00.000Z' })
      .where(eq(submissionLogs.userId, beta.user.id))

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

    const excludedRes = await request(
      app,
      '/api/v2/admin/submission-logs?limit=100&offset=0&excludeResults=incorrect',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const excludedBody = await expectResponse(
      excludedRes,
      GoodAdminSubmissionLogs
    )
    expect(excludedBody.data.logs.map((log: any) => log.result)).toEqual([
      SubmissionLogResult.CORRECT,
    ])

    const statusRes = await request(
      app,
      `/api/v2/admin/submission-logs?limit=100&offset=0&teamStatuses=${SubmissionLogTeamStatus.BANNED}`,
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const statusBody = await expectResponse(statusRes, GoodAdminSubmissionLogs)
    expect(statusBody.data.logs.map((log: any) => log.userName)).toEqual([
      'Beta Team',
    ])

    const scopedParams = new URLSearchParams({
      limit: '100',
      offset: '0',
      categories: 'web',
      divisions: alphaDivision,
      createdAfter: '2026-05-05T09:30:00.000Z',
      createdBefore: '2026-05-05T10:30:00.000Z',
    })
    const scopedRes = await request(
      app,
      `/api/v2/admin/submission-logs?${scopedParams}`,
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const scopedBody = await expectResponse(scopedRes, GoodAdminSubmissionLogs)
    expect(scopedBody.data.logs.map((log: any) => log.userName)).toEqual([
      'Alpha Team',
    ])
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

  test('rejects invalid excluded result filters', async () => {
    const admin = await generateRealTestUser(
      Permissions.usersWrite | Permissions.challsRead
    )

    const res = await request(
      app,
      '/api/v2/admin/submission-logs?limit=10&offset=0&excludeResults=correct,nope',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, BadBody)
    expect(body.data.reason).toBe(
      'query:excludeResults: invalid submission log result'
    )
  })

  test('rejects invalid team status, division, and time filters', async () => {
    const admin = await generateRealTestUser(
      Permissions.usersWrite | Permissions.challsRead
    )
    const token = await generateAuthToken(admin.user.id)

    for (const [query, reason] of [
      ['teamStatuses=banned,nope', 'query:teamStatuses: invalid team status'],
      ['divisions=nope', 'query:divisions: invalid division'],
      ['createdAfter=nope', 'query:createdAfter: invalid date'],
      [
        'createdAfter=2026-05-05T11%3A00%3A00.000Z&createdBefore=2026-05-05T10%3A00%3A00.000Z',
        'query:createdAfter: must be before createdBefore',
      ],
    ] as const) {
      const res = await request(
        app,
        `/api/v2/admin/submission-logs?limit=10&offset=0&${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const body = await expectResponse(res, BadBody)
      expect(body.data.reason).toBe(reason)
    }
  })
})
