import { config } from '@rctf/config'
import { createDatabase, solves, users } from '@rctf/db'
import {
  AdminTeamSortBy,
  AdminTeamStatus,
  BadBody,
  GoodAdminUsersV2,
  GoodLeaderboardV2,
  GoodLeaderboardWithGraph,
  Permissions,
  SortOrder,
} from '@rctf/types'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { cacheLeaderboardAndGraph } from '../../../../apps/api/src/cache/leaderboard'
import { createToken, TokenKind } from '../../../../apps/api/src/lib/tokens'
import { calculateLeaderboard } from '../../../../apps/api/src/services/leaderboard'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { getApp, request } from '../../app'
import { expectResponse, generateChallenge } from '../../util'

let app: Hono<any>

const getDb = () => createDatabase(config.database.sql).db

const recomputeLeaderboard = async () => {
  const db = getDb()
  const redis = await createRedis()
  const result = await calculateLeaderboard(db)
  await cacheLeaderboardAndGraph(db, redis, result)
}

type TestUser = {
  id: string
  name: string
  email: string
  division: string
}

const testUsers: TestUser[] = []
let challengeId: string
let challengeFlag: string
let challengeCleanup: () => Promise<void>
let adminToken: string

const createNamedUser = async (
  name: string,
  division?: string
): Promise<TestUser> => {
  const db = getDb()
  const id = crypto.randomUUID()
  const email = `${crypto.randomUUID()}@test.com`
  const div = division ?? Object.keys(config.divisions)[0]!

  await db.insert(users).values({
    id,
    name,
    email,
    division: div,
    perms: 0,
  })

  const user = { id, name, email, division: div }
  testUsers.push(user)
  return user
}

const submitFlag = async (userId: string) => {
  const token = await createToken(TokenKind.Auth, userId)
  return request(
    app,
    `/api/v1/challs/${encodeURIComponent(challengeId)}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ flag: challengeFlag }),
    }
  )
}

beforeAll(async () => {
  app = await getApp()

  const ch = await generateChallenge()
  challengeId = ch.challenge.id
  challengeFlag = ch.challenge.flag
  challengeCleanup = ch.cleanup

  const alphaTeam = await createNamedUser('AlphaTeam')
  const betaTeam = await createNamedUser('BetaTeam')
  await createNamedUser('GammaSquad')
  await createNamedUser('DeltaForce')
  const alphaTeem = await createNamedUser('AlphaTeem')
  await createNamedUser('Zeta')
  await createNamedUser('CollegeCrew', 'college')
  const bannedTeam = await createNamedUser('BannedTeam')

  const ch2 = await generateChallenge()

  await submitFlag(alphaTeam.id)
  await submitFlag(betaTeam.id)
  await submitFlag(alphaTeem.id)

  const alphaToken = await createToken(TokenKind.Auth, alphaTeam.id)
  await request(
    app,
    `/api/v1/challs/${encodeURIComponent(ch2.challenge.id)}/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alphaToken}`,
      },
      body: JSON.stringify({ flag: ch2.challenge.flag }),
    }
  )

  await recomputeLeaderboard()

  const db = getDb()
  await db
    .update(users)
    .set({ banned: true })
    .where(eq(users.id, bannedTeam.id))

  const adminId = crypto.randomUUID()
  const adminEmail = `admin-${crypto.randomUUID()}@test.com`
  await db.insert(users).values({
    id: adminId,
    name: `Admin-${crypto.randomUUID()}`,
    email: adminEmail,
    division: Object.keys(config.divisions)[0]!,
    perms: Permissions.usersWrite,
  })
  testUsers.push({
    id: adminId,
    name: 'admin',
    email: adminEmail,
    division: Object.keys(config.divisions)[0]!,
  })
  adminToken = await createToken(TokenKind.Auth, adminId)
})

afterAll(async () => {
  const db = getDb()
  for (const user of testUsers) {
    await db.delete(solves).where(eq(solves.userid, user.id))
    await db.delete(users).where(eq(users.id, user.id))
  }
  await challengeCleanup()
  await recomputeLeaderboard()
})

beforeEach(async () => {
  const redis = await createRedis()
  await redis.del('rl:SEARCH:127.0.0.1')
})

describe('leaderboard search', () => {
  test('no search param returns full leaderboard', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    expect(body.data.leaderboard.length).toBeGreaterThan(0)
  })

  test('search matches substring via word similarity', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0&search=Alpha',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    const names = body.data.leaderboard.map((e: any) => e.name)
    expect(names).toContain('AlphaTeam')
    expect(names).toContain('AlphaTeem')
  })

  test('search matches fuzzy/typo via trigram similarity', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0&search=AlphaTeam',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    const names = body.data.leaderboard.map((e: any) => e.name)
    expect(names).toContain('AlphaTeam')
    expect(names).toContain('AlphaTeem')
  })

  test('search is case insensitive', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0&search=alphateam',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    const names = body.data.leaderboard.map((e: any) => e.name)
    expect(names).toContain('AlphaTeam')
  })

  test('search with no results returns empty leaderboard', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0&search=NonExistentTeamXYZ',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    expect(body.data.leaderboard).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  test('with-graph search returns graph rows for the searched leaderboard order', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/with-graph?limit=2&offset=0&search=AlphaTeam',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardWithGraph)

    expect(body.data.leaderboard.map((entry: any) => entry.name)).toEqual([
      'AlphaTeam',
      'AlphaTeem',
    ])
    expect(body.data.graph.map((entry: any) => entry.id)).toEqual(
      body.data.leaderboard.map((entry: any) => entry.id)
    )
  })

  test('with-graph search with no results returns empty graph', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/with-graph?limit=100&offset=0&search=NonExistentTeamXYZ',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardWithGraph)

    expect(body.data.leaderboard).toHaveLength(0)
    expect(body.data.graph).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  test('search results are sorted by similarity', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0&search=AlphaTeam',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    const names = body.data.leaderboard.map((e: any) => e.name)
    // AlphaTeam should rank before AlphaTeem (higher similarity to "AlphaTeam")
    const alphaTeamIdx = names.indexOf('AlphaTeam')
    const alphaTeemIdx = names.indexOf('AlphaTeem')
    expect(alphaTeamIdx).toBeLessThan(alphaTeemIdx)
  })

  test('search results have correct response shape', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0&search=Alpha',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    for (const entry of body.data.leaderboard) {
      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('score')
      expect(entry).toHaveProperty('solves')
      expect(entry).toHaveProperty('globalPlace')
      expect(entry).toHaveProperty('avatarUrl')
      expect(entry).toHaveProperty('countryCode')
      expect(entry).toHaveProperty('statusText')
    }
  })

  test('search pagination works', async () => {
    const res1 = await request(
      app,
      '/api/v2/leaderboard/now?limit=1&offset=0&search=Alpha',
      { method: 'GET' }
    )
    const body1 = await expectResponse(res1, GoodLeaderboardV2)

    const res2 = await request(
      app,
      '/api/v2/leaderboard/now?limit=1&offset=1&search=Alpha',
      { method: 'GET' }
    )
    const body2 = await expectResponse(res2, GoodLeaderboardV2)

    expect(body1.data.leaderboard).toHaveLength(1)
    expect(body2.data.leaderboard).toHaveLength(1)
    expect(body1.data.leaderboard[0].id).not.toBe(body2.data.leaderboard[0].id)
  })

  test('search total is consistent across pages', async () => {
    const res1 = await request(
      app,
      '/api/v2/leaderboard/now?limit=1&offset=0&search=Alpha',
      { method: 'GET' }
    )
    const body1 = await expectResponse(res1, GoodLeaderboardV2)

    const res2 = await request(
      app,
      '/api/v2/leaderboard/now?limit=1&offset=1&search=Alpha',
      { method: 'GET' }
    )
    const body2 = await expectResponse(res2, GoodLeaderboardV2)

    expect(body1.data.total).toBe(body2.data.total)
    expect(body1.data.total).toBeGreaterThanOrEqual(2)
  })

  test('search excludes users with 0 solves', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0&search=Zeta',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    expect(body.data.leaderboard).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  test('search offset beyond results returns empty leaderboard', async () => {
    const res = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0&search=Alpha',
      { method: 'GET' }
    )
    const body = await expectResponse(res, GoodLeaderboardV2)
    const total = body.data.total

    const res2 = await request(
      app,
      `/api/v2/leaderboard/now?limit=100&offset=${total}&search=Alpha`,
      { method: 'GET' }
    )
    const body2 = await expectResponse(res2, GoodLeaderboardV2)
    expect(body2.data.leaderboard).toHaveLength(0)
    expect(body2.data.total).toBe(total)
  })
})

describe('admin users search', () => {
  const requestAdminUsers = (
    query: string,
    body: unknown = {},
    token: string | null = adminToken
  ) =>
    request(app, `/api/v2/admin/users${query}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })

  const requestAdminUsersGet = (
    query: string,
    token: string | null = adminToken
  ) =>
    request(app, `/api/v2/admin/users${query}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

  test('no search param returns all users', async () => {
    const res = await requestAdminUsers('?limit=100&offset=0')
    const body = await expectResponse(res, GoodAdminUsersV2)
    expect(body.data.users.length).toBeGreaterThan(0)
    expect(body.data.total).toBeGreaterThan(0)
  })

  test('documented GET endpoint returns query-only user lists', async () => {
    const res = await requestAdminUsersGet('?limit=100&offset=0&search=Alpha')
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)

    expect(names).toContain('AlphaTeam')
    expect(names).toContain('AlphaTeem')
  })

  test('search matches substring via word similarity', async () => {
    const res = await requestAdminUsers('?limit=100&offset=0&search=Alpha')
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)
    expect(names).toContain('AlphaTeam')
    expect(names).toContain('AlphaTeem')
  })

  test('search matches fuzzy/typo via trigram similarity', async () => {
    const res = await requestAdminUsers('?limit=100&offset=0&search=AlphaTeam')
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)
    expect(names).toContain('AlphaTeam')
    expect(names).toContain('AlphaTeem')
  })

  test('search is case insensitive', async () => {
    const res = await requestAdminUsers('?limit=100&offset=0&search=alphateam')
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)
    expect(names).toContain('AlphaTeam')
  })

  test('search with no results returns empty list', async () => {
    const res = await requestAdminUsers(
      '?limit=100&offset=0&search=NonExistentXYZ'
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    expect(body.data.users).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  test('total reflects filtered count', async () => {
    const resAll = await requestAdminUsers('?limit=100&offset=0')
    const bodyAll = await expectResponse(resAll, GoodAdminUsersV2)

    const resSearch = await requestAdminUsers(
      '?limit=100&offset=0&search=Alpha'
    )
    const bodySearch = await expectResponse(resSearch, GoodAdminUsersV2)

    expect(bodySearch.data.total).toBeLessThan(bodyAll.data.total)
    expect(bodySearch.data.total).toBe(bodySearch.data.users.length)
  })

  test('pagination with search works', async () => {
    const res1 = await requestAdminUsers('?limit=1&offset=0&search=Alpha')
    const body1 = await expectResponse(res1, GoodAdminUsersV2)

    const res2 = await requestAdminUsers('?limit=1&offset=1&search=Alpha')
    const body2 = await expectResponse(res2, GoodAdminUsersV2)

    expect(body1.data.users).toHaveLength(1)
    expect(body2.data.users).toHaveLength(1)
    expect(body1.data.users[0].id).not.toBe(body2.data.users[0].id)
  })

  test('sorts teams by score', async () => {
    const res = await requestAdminUsers(
      `?limit=100&offset=0&sortBy=${AdminTeamSortBy.SCORE}&sortOrder=${SortOrder.DESC}`
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)

    expect(names.indexOf('AlphaTeam')).toBeLessThan(names.indexOf('AlphaTeem'))
    expect(names.indexOf('AlphaTeam')).toBeLessThan(names.indexOf('BetaTeam'))
  })

  test('filters teams by division', async () => {
    const res = await requestAdminUsers('?limit=100&offset=0', {
      division: { include: ['college'] },
    })
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)

    expect(names).toContain('CollegeCrew')
    expect(body.data.users.every((u: any) => u.division === 'college')).toBe(
      true
    )
  })

  test('filters teams by status', async () => {
    const res = await requestAdminUsers('?limit=100&offset=0', {
      status: { include: [AdminTeamStatus.BANNED] },
    })
    const body = await expectResponse(res, GoodAdminUsersV2)

    expect(body.data.users.map((u: any) => u.name)).toContain('BannedTeam')
    expect(body.data.users.every((u: any) => u.banned && u.perms === 0)).toBe(
      true
    )
  })

  test('rejects invalid team filters', async () => {
    const res = await requestAdminUsers('?limit=100&offset=0', {
      status: { include: ['missing'] },
    })

    await expectResponse(res, BadBody)
  })

  test('unauthenticated search returns 401', async () => {
    const res = await requestAdminUsers(
      '?limit=100&offset=0&search=Alpha',
      {},
      null
    )
    expect(res.status).toBe(401)
  })
})
