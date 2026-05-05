import { config } from '@rctf/config'
import { createDatabase, solves, users } from '@rctf/db'
import {
  BadPerms,
  GoodAdminUserDeleteV2,
  GoodAdminUserUpdateV2,
  GoodAdminUserV2,
  GoodLeaderboardV2,
  Permissions,
} from '@rctf/types'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { cacheLeaderboardAndGraph } from '../../../../apps/api/src/cache/leaderboard'
import { calculateLeaderboard } from '../../../../apps/api/src/services/leaderboard'
import { createRedis } from '../../../../apps/api/src/util/redis'
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

const recomputeLeaderboard = async () => {
  const db = getDb()
  const redis = await createRedis()
  const result = await calculateLeaderboard(db)
  await cacheLeaderboardAndGraph(db, redis, result)
}

beforeAll(async () => {
  app = await getApp()
})

beforeEach(async () => {
  await clearDatabase()
})

describe('admin users', () => {
  test('returns email and solves in team details', async () => {
    const admin = await generateRealTestUser(
      Permissions.usersWrite | Permissions.challsRead
    )
    const solver = await generateRealTestUser()
    const { challenge } = await generateChallenge()
    const db = getDb()

    await db.insert(solves).values({
      id: crypto.randomUUID(),
      challengeid: challenge.id,
      userid: solver.user.id,
      createdat: new Date(config.startTime + 1000).toISOString(),
    })

    const res = await request(app, `/api/v2/admin/users/${solver.user.id}`, {
      headers: {
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
    })

    const body = await expectResponse(res, GoodAdminUserV2)
    expect(body.data.email).toBe(solver.user.email)
    expect(body.data.solves).toHaveLength(1)
    expect(body.data.solves[0].challengeId).toBe(challenge.id)
  })

  test('team details require challenge read permission', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const solver = await generateRealTestUser()

    const res = await request(app, `/api/v2/admin/users/${solver.user.id}`, {
      headers: {
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
    })

    await expectResponse(res, BadPerms)
  })

  test('banning a team removes it from leaderboard without deleting solves', async () => {
    const admin = await generateRealTestUser(
      Permissions.usersWrite | Permissions.leaderboardRead
    )
    const solver = await generateRealTestUser()
    const { challenge } = await generateChallenge()
    const db = getDb()

    await db.insert(solves).values({
      id: crypto.randomUUID(),
      challengeid: challenge.id,
      userid: solver.user.id,
      createdat: new Date(config.startTime + 1000).toISOString(),
    })

    await recomputeLeaderboard()

    const beforeRes = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const beforeBody = await expectResponse(beforeRes, GoodLeaderboardV2)
    expect(beforeBody.data.leaderboard.map((u: any) => u.id)).toContain(
      solver.user.id
    )

    const banRes = await request(app, `/api/v2/admin/users/${solver.user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
      body: JSON.stringify({ data: { banned: true } }),
    })
    await expectResponse(banRes, GoodAdminUserUpdateV2)
    await recomputeLeaderboard()

    const afterRes = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const afterBody = await expectResponse(afterRes, GoodLeaderboardV2)
    expect(afterBody.data.leaderboard.map((u: any) => u.id)).not.toContain(
      solver.user.id
    )

    const remainingSolves = await db
      .select()
      .from(solves)
      .where(eq(solves.userid, solver.user.id))
    expect(remainingSolves).toHaveLength(1)

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, solver.user.id))
    expect(updatedUser?.banned).toBe(true)
    expect(updatedUser?.globalRank).toBeNull()
  })

  test('deleting a team removes the team and its solves', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const solver = await generateRealTestUser()
    const { challenge } = await generateChallenge()
    const db = getDb()

    await db.insert(solves).values({
      id: crypto.randomUUID(),
      challengeid: challenge.id,
      userid: solver.user.id,
      createdat: new Date(config.startTime + 1000).toISOString(),
    })

    const res = await request(app, `/api/v2/admin/users/${solver.user.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
    })

    await expectResponse(res, GoodAdminUserDeleteV2)
    expect(
      await db.select().from(users).where(eq(users.id, solver.user.id))
    ).toHaveLength(0)
    expect(
      await db.select().from(solves).where(eq(solves.userid, solver.user.id))
    ).toHaveLength(0)
  })
})
