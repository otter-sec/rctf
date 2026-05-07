import { config } from '@rctf/config'
import { createDatabase, solves, users } from '@rctf/db'
import {
  BadEndpoint,
  BadKnownEmail,
  BadPerms,
  BadUnknownVerification,
  GoodAdminUserDeleteV2,
  GoodAdminUserUpdateV2,
  GoodAdminUserV2,
  GoodAdminUserVerificationCompleteV2,
  GoodAdminUserVerificationResendV2,
  GoodAdminUserVerificationsV2,
  GoodLeaderboardV2,
  Permissions,
} from '@rctf/types'
import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { createLoginVerification } from '../../../../apps/api/src/cache/auth-cache'
import { cacheLeaderboardAndGraph } from '../../../../apps/api/src/cache/leaderboard'
import { emailProvider } from '../../../../apps/api/src/providers'
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
  const redis = await createRedis()
  await redis.flushdb()
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

  test('unbanning a team restores it to the leaderboard with prior score and rank', async () => {
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

    const [beforeBan] = await db
      .select()
      .from(users)
      .where(eq(users.id, solver.user.id))
    expect(beforeBan?.banned).toBe(false)
    expect(beforeBan?.globalRank).not.toBeNull()
    expect(beforeBan?.score).toBeGreaterThan(0)
    const originalScore = beforeBan!.score
    const originalGlobalRank = beforeBan!.globalRank
    const originalDivisionRank = beforeBan!.divisionRank

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

    const [afterBan] = await db
      .select()
      .from(users)
      .where(eq(users.id, solver.user.id))
    expect(afterBan?.banned).toBe(true)
    expect(afterBan?.globalRank).toBeNull()
    expect(afterBan?.score).toBe(0)

    const unbanRes = await request(
      app,
      `/api/v2/admin/users/${solver.user.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
        body: JSON.stringify({ data: { banned: false } }),
      }
    )
    await expectResponse(unbanRes, GoodAdminUserUpdateV2)
    await recomputeLeaderboard()

    const [afterUnban] = await db
      .select()
      .from(users)
      .where(eq(users.id, solver.user.id))
    expect(afterUnban?.banned).toBe(false)
    expect(afterUnban?.score).toBe(originalScore)
    expect(afterUnban?.globalRank).toBe(originalGlobalRank)
    expect(afterUnban?.divisionRank).toBe(originalDivisionRank)

    const leaderboardRes = await request(
      app,
      '/api/v2/leaderboard/now?limit=100&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const leaderboardBody = await expectResponse(
      leaderboardRes,
      GoodLeaderboardV2
    )
    expect(leaderboardBody.data.leaderboard.map((u: any) => u.id)).toContain(
      solver.user.id
    )

    const remainingSolves = await db
      .select()
      .from(solves)
      .where(eq(solves.userid, solver.user.id))
    expect(remainingSolves).toHaveLength(1)
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

  test('lists pending team email verifications', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const redis = await createRedis()
    const first = {
      kind: 'register' as const,
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
      division: Object.keys(config.divisions)[0]!,
    }
    const second = {
      ...first,
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
    }

    await createLoginVerification(redis, first)
    await createLoginVerification(redis, second)

    const res = await request(
      app,
      '/api/v2/admin/user-verifications?limit=1&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, GoodAdminUserVerificationsV2)
    expect(body.data.total).toBe(2)
    expect(body.data.verifications).toHaveLength(1)
    expect([first.email, second.email]).toContain(
      body.data.verifications[0].email
    )
  })

  test('manually completes a pending team email verification', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const redis = await createRedis()
    const db = getDb()
    const pending = {
      kind: 'register' as const,
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
      division: Object.keys(config.divisions)[0]!,
    }

    await createLoginVerification(redis, pending)
    const beforeRes = await request(
      app,
      '/api/v2/admin/user-verifications?limit=100&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const beforeBody = await expectResponse(
      beforeRes,
      GoodAdminUserVerificationsV2
    )
    const verificationId = beforeBody.data.verifications[0].id

    const res = await request(
      app,
      `/api/v2/admin/user-verifications/${verificationId}/complete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    const body = await expectResponse(res, GoodAdminUserVerificationCompleteV2)
    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.id, body.data.userId))
    expect(created?.email).toBe(pending.email)
    expect(created?.name).toBe(pending.name)

    const afterRes = await request(
      app,
      '/api/v2/admin/user-verifications?limit=100&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const afterBody = await expectResponse(
      afterRes,
      GoodAdminUserVerificationsV2
    )
    expect(afterBody.data.total).toBe(0)
    expect(afterBody.data.verifications).toHaveLength(0)
  })

  test('completing a pending team email verification keeps duplicate email pending', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const existing = await generateRealTestUser()
    const redis = await createRedis()
    const pending = {
      kind: 'register' as const,
      name: crypto.randomUUID(),
      email: existing.user.email!,
      division: Object.keys(config.divisions)[0]!,
    }

    await createLoginVerification(redis, pending)
    const beforeRes = await request(
      app,
      '/api/v2/admin/user-verifications?limit=100&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const beforeBody = await expectResponse(
      beforeRes,
      GoodAdminUserVerificationsV2
    )
    const verificationId = beforeBody.data.verifications[0].id

    const res = await request(
      app,
      `/api/v2/admin/user-verifications/${verificationId}/complete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    await expectResponse(res, BadKnownEmail)

    const afterRes = await request(
      app,
      '/api/v2/admin/user-verifications?limit=100&offset=0',
      {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    const afterBody = await expectResponse(
      afterRes,
      GoodAdminUserVerificationsV2
    )
    expect(afterBody.data.verifications.map(v => v.id)).toContain(
      verificationId
    )
  })

  test('completing an unknown team email verification fails', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)

    const res = await request(
      app,
      `/api/v2/admin/user-verifications/${crypto.randomUUID()}/complete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    await expectResponse(res, BadUnknownVerification)
  })

  test('resends a pending team email verification with a new id', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const redis = await createRedis()
    const pending = {
      kind: 'register' as const,
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
      division: Object.keys(config.divisions)[0]!,
    }
    const oldSend = emailProvider!.send
    emailProvider!.send = mock(async () => {})

    try {
      await createLoginVerification(redis, pending)
      const beforeRes = await request(
        app,
        '/api/v2/admin/user-verifications?limit=100&offset=0',
        {
          headers: {
            Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
          },
        }
      )
      const beforeBody = await expectResponse(
        beforeRes,
        GoodAdminUserVerificationsV2
      )
      const verificationId = beforeBody.data.verifications[0].id

      const res = await request(
        app,
        `/api/v2/admin/user-verifications/${verificationId}/resend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
          },
        }
      )

      const body = await expectResponse(res, GoodAdminUserVerificationResendV2)
      expect(body.data.verificationId).not.toBe(verificationId)
      expect(emailProvider!.send).toHaveBeenCalled()

      const afterRes = await request(
        app,
        '/api/v2/admin/user-verifications?limit=100&offset=0',
        {
          headers: {
            Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
          },
        }
      )
      const afterBody = await expectResponse(
        afterRes,
        GoodAdminUserVerificationsV2
      )
      expect(afterBody.data.verifications.map(v => v.id)).not.toContain(
        verificationId
      )
      expect(afterBody.data.verifications.map(v => v.id)).toContain(
        body.data.verificationId
      )
    } finally {
      emailProvider!.send = oldSend
    }
  })

  test('resending a pending team email verification requires email provider', async () => {
    const oldEmail = config.email
    config.email = undefined

    try {
      const admin = await generateRealTestUser(Permissions.usersWrite)
      const redis = await createRedis()
      const pending = {
        kind: 'register' as const,
        name: crypto.randomUUID(),
        email: `${crypto.randomUUID()}@pending.test`,
        division: Object.keys(config.divisions)[0]!,
      }

      await createLoginVerification(redis, pending)
      const beforeRes = await request(
        app,
        '/api/v2/admin/user-verifications?limit=100&offset=0',
        {
          headers: {
            Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
          },
        }
      )
      const beforeBody = await expectResponse(
        beforeRes,
        GoodAdminUserVerificationsV2
      )
      const verificationId = beforeBody.data.verifications[0].id

      const res = await request(
        app,
        `/api/v2/admin/user-verifications/${verificationId}/resend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
          },
        }
      )

      await expectResponse(res, BadEndpoint)

      const afterRes = await request(
        app,
        '/api/v2/admin/user-verifications?limit=100&offset=0',
        {
          headers: {
            Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
          },
        }
      )
      const afterBody = await expectResponse(
        afterRes,
        GoodAdminUserVerificationsV2
      )
      expect(afterBody.data.verifications.map(v => v.id)).toContain(
        verificationId
      )
    } finally {
      config.email = oldEmail
    }
  })

  test('resending an unknown team email verification fails', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)

    const res = await request(
      app,
      `/api/v2/admin/user-verifications/${crypto.randomUUID()}/resend`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    await expectResponse(res, BadUnknownVerification)
  })
})
