import { config } from '@rctf/config'
import { challenges, createDatabase, submissions, users } from '@rctf/db'
import {
  BadBody,
  BadFlag,
  BadPerms,
  GoodAdminSubmissions,
  GoodFlag,
  Permissions,
  SubmissionKind,
  SubmissionResult,
  SubmissionTeamStatus,
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

describe('admin submissions', () => {
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
      .update(submissions)
      .set({ createdAt: '2026-05-05T10:00:00.000Z' })
      .where(eq(submissions.userId, alpha.user.id))
    await db
      .update(submissions)
      .set({ createdAt: '2026-05-05T11:00:00.000Z' })
      .where(eq(submissions.userId, beta.user.id))

    const storedSubmissions = await db.select().from(submissions)
    expect(storedSubmissions).toHaveLength(2)
    expect(
      storedSubmissions.every(submission => submission.ip === '127.0.0.1')
    ).toBe(true)
    expect(
      storedSubmissions.map(submission => submission.details)
    ).toContainEqual({
      submittedFlag: alphaChallenge.challenge.flag,
    })
    expect(
      storedSubmissions.map(submission => submission.details)
    ).toContainEqual({
      submittedFlag: 'wrong',
    })

    const res = await request(
      app,
      '/api/v2/admin/submissions?limit=100&offset=0&sortBy=team&sortOrder=asc',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, GoodAdminSubmissions)
    expect(body.data.total).toBe(2)
    expect(
      body.data.submissions.map((submission: any) => submission.userName)
    ).toEqual(['Alpha Team', 'Beta Team'])
    expect(body.data.submissions[0]).toMatchObject({
      kind: SubmissionKind.FLAG,
      result: SubmissionResult.CORRECT,
      challengeName: 'Alpha Challenge',
      ip: '127.0.0.1',
      details: {
        submittedFlag: alphaChallenge.challenge.flag,
      },
    })
    expect(body.data.submissions[1]).toMatchObject({
      kind: SubmissionKind.FLAG,
      result: SubmissionResult.INCORRECT,
      challengeName: 'Beta Challenge',
      ip: '127.0.0.1',
      details: {
        submittedFlag: 'wrong',
      },
    })

    const excludedRes = await request(
      app,
      '/api/v2/admin/submissions?limit=100&offset=0&excludeResults=incorrect',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const excludedBody = await expectResponse(excludedRes, GoodAdminSubmissions)
    expect(
      excludedBody.data.submissions.map((submission: any) => submission.result)
    ).toEqual([SubmissionResult.CORRECT])

    const statusRes = await request(
      app,
      `/api/v2/admin/submissions?limit=100&offset=0&teamStatuses=${SubmissionTeamStatus.BANNED}`,
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const statusBody = await expectResponse(statusRes, GoodAdminSubmissions)
    expect(
      statusBody.data.submissions.map((submission: any) => submission.userName)
    ).toEqual(['Beta Team'])

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
      `/api/v2/admin/submissions?${scopedParams}`,
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const scopedBody = await expectResponse(scopedRes, GoodAdminSubmissions)
    expect(
      scopedBody.data.submissions.map((submission: any) => submission.userName)
    ).toEqual(['Alpha Team'])
  })

  test('requires team and challenge admin permissions', async () => {
    const admin = await generateRealTestUser(Permissions.challsRead)

    const res = await request(
      app,
      '/api/v2/admin/submissions?limit=10&offset=0',
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
      '/api/v2/admin/submissions?limit=10&offset=0&results=correct,nope',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, BadBody)
    expect(body.data.reason).toBe('query:results: invalid submission result')
  })

  test('rejects invalid excluded result filters', async () => {
    const admin = await generateRealTestUser(
      Permissions.usersWrite | Permissions.challsRead
    )

    const res = await request(
      app,
      '/api/v2/admin/submissions?limit=10&offset=0&excludeResults=correct,nope',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, BadBody)
    expect(body.data.reason).toBe(
      'query:excludeResults: invalid submission result'
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
        `/api/v2/admin/submissions?limit=10&offset=0&${query}`,
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
