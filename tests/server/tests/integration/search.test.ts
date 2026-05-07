import { config } from '@rctf/config'
import { createDatabase, solves, users } from '@rctf/db'
import {
  AdminTeamSortBy,
  AdminTeamSortOrder,
  AdminTeamStatus,
  BadBody,
  GoodAdminUsersV2,
  GoodLeaderboardV2,
  GoodLeaderboardWithGraph,
  Permissions,
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
let adminName: string
let alphaTeamEmail: string

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

const adminUsersUrl = (query: Record<string, string | number>): string => {
  const params = new URLSearchParams({ limit: '100', offset: '0' })
  for (const [key, value] of Object.entries(query)) {
    params.set(key, String(value))
  }

  return `/api/v2/admin/users?${params.toString()}`
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
  alphaTeamEmail = alphaTeam.email

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
  adminName = `Admin-${crypto.randomUUID()}`
  await db.insert(users).values({
    id: adminId,
    name: adminName,
    email: adminEmail,
    division: Object.keys(config.divisions)[0]!,
    perms: Permissions.usersWrite,
  })
  testUsers.push({
    id: adminId,
    name: adminName,
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
  test('no search param returns all users', async () => {
    const res = await request(app, '/api/v2/admin/users?limit=100&offset=0', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const body = await expectResponse(res, GoodAdminUsersV2)
    expect(body.data.users.length).toBeGreaterThan(0)
    expect(body.data.total).toBeGreaterThan(0)
  })

  test('search matches substring via word similarity', async () => {
    const res = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&search=Alpha',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)
    expect(names).toContain('AlphaTeam')
    expect(names).toContain('AlphaTeem')
  })

  test('search matches fuzzy/typo via trigram similarity', async () => {
    const res = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&search=AlphaTeam',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)
    expect(names).toContain('AlphaTeam')
    expect(names).toContain('AlphaTeem')
  })

  test('search is case insensitive', async () => {
    const res = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&search=alphateam',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)
    expect(names).toContain('AlphaTeam')
  })

  test('search matches email', async () => {
    const res = await request(
      app,
      adminUsersUrl({ search: alphaTeamEmail.toUpperCase() }),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)
    expect(names).toEqual(['AlphaTeam'])
    expect(body.data.total).toBe(1)
  })

  test('search with no results returns empty list', async () => {
    const res = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&search=NonExistentXYZ',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    expect(body.data.users).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  test('total reflects filtered count', async () => {
    const resAll = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const bodyAll = await expectResponse(resAll, GoodAdminUsersV2)

    const resSearch = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&search=Alpha',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const bodySearch = await expectResponse(resSearch, GoodAdminUsersV2)

    expect(bodySearch.data.total).toBeLessThan(bodyAll.data.total)
    expect(bodySearch.data.total).toBe(bodySearch.data.users.length)
  })

  test('sorts by score descending', async () => {
    const res = await request(
      app,
      adminUsersUrl({
        sortBy: AdminTeamSortBy.SCORE,
        sortOrder: AdminTeamSortOrder.DESC,
      }),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)
    const alphaTeamIdx = names.indexOf('AlphaTeam')
    const betaTeamIdx = names.indexOf('BetaTeam')

    expect(alphaTeamIdx).toBeGreaterThanOrEqual(0)
    expect(betaTeamIdx).toBeGreaterThanOrEqual(0)
    expect(alphaTeamIdx).toBeLessThan(betaTeamIdx)
  })

  test('sorts by team name when search is present', async () => {
    const ascRes = await request(
      app,
      adminUsersUrl({
        search: 'Alpha',
        sortBy: AdminTeamSortBy.TEAM,
        sortOrder: AdminTeamSortOrder.ASC,
      }),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const ascBody = await expectResponse(ascRes, GoodAdminUsersV2)
    expect(ascBody.data.users.map((u: any) => u.name)).toEqual([
      'AlphaTeam',
      'AlphaTeem',
    ])

    const descRes = await request(
      app,
      adminUsersUrl({
        search: 'Alpha',
        sortBy: AdminTeamSortBy.TEAM,
        sortOrder: AdminTeamSortOrder.DESC,
      }),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const descBody = await expectResponse(descRes, GoodAdminUsersV2)
    expect(descBody.data.users.map((u: any) => u.name)).toEqual([
      'AlphaTeem',
      'AlphaTeam',
    ])
  })

  test('filters by division', async () => {
    const res = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&divisions=college',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    const names = body.data.users.map((u: any) => u.name)

    expect(names).toContain('CollegeCrew')
    expect(body.data.users.every((u: any) => u.division === 'college')).toBe(
      true
    )
  })

  test('excludes divisions', async () => {
    const res = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&search=College&excludeDivisions=college',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    expect(body.data.users).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  test('filters by status', async () => {
    const bannedRes = await request(
      app,
      `/api/v2/admin/users?limit=100&offset=0&search=BannedTeam&statuses=${AdminTeamStatus.BANNED}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const bannedBody = await expectResponse(bannedRes, GoodAdminUsersV2)
    expect(bannedBody.data.users.map((u: any) => u.name)).toEqual([
      'BannedTeam',
    ])
    expect(bannedBody.data.users.every((u: any) => u.banned)).toBe(true)

    const adminRes = await request(
      app,
      `/api/v2/admin/users?limit=100&offset=0&search=Admin&statuses=${AdminTeamStatus.ADMIN}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const adminBody = await expectResponse(adminRes, GoodAdminUsersV2)
    const names = adminBody.data.users.map((u: any) => u.name)
    expect(names).toContain(adminName)
    expect(adminBody.data.users.every((u: any) => u.perms > 0)).toBe(true)
  })

  test('excludes statuses', async () => {
    const res = await request(
      app,
      adminUsersUrl({
        search: 'BannedTeam',
        excludeStatuses: AdminTeamStatus.BANNED,
      }),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body = await expectResponse(res, GoodAdminUsersV2)
    expect(body.data.users).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  test('rejects invalid filters', async () => {
    const invalidDivisionRes = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&divisions=nope',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    await expectResponse(invalidDivisionRes, BadBody)

    const invalidStatusRes = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&statuses=nope',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    await expectResponse(invalidStatusRes, BadBody)

    const invalidSortRes = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&sortBy=nope',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    await expectResponse(invalidSortRes, BadBody)
  })

  test('pagination with search works', async () => {
    const res1 = await request(
      app,
      '/api/v2/admin/users?limit=1&offset=0&search=Alpha',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body1 = await expectResponse(res1, GoodAdminUsersV2)

    const res2 = await request(
      app,
      '/api/v2/admin/users?limit=1&offset=1&search=Alpha',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    const body2 = await expectResponse(res2, GoodAdminUsersV2)

    expect(body1.data.users).toHaveLength(1)
    expect(body2.data.users).toHaveLength(1)
    expect(body1.data.users[0].id).not.toBe(body2.data.users[0].id)
  })

  test('unauthenticated search returns 401', async () => {
    const res = await request(
      app,
      '/api/v2/admin/users?limit=100&offset=0&search=Alpha',
      { method: 'GET' }
    )
    expect(res.status).toBe(401)
  })
})
