import { config } from '@rctf/config'
import { createDatabase, solves, users } from '@rctf/db'
import {
  BadEndpoint,
  BadKnownEmail,
  BadPerms,
  BadTokenVerification,
  BadUnknownVerification,
  GoodAdminUserDeleteV2,
  GoodAdminUserUpdateV2,
  GoodAdminUserV2,
  GoodAdminUserVerificationCompleteV2,
  GoodAdminUserVerificationsV2,
  GoodLeaderboardV2,
  GoodRegister,
  GoodVerifyInfo,
  Permissions,
} from '@rctf/types'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { cacheLeaderboardAndGraph } from '../../../../apps/api/src/cache/leaderboard'
import { resendPendingTeamVerification } from '../../../../apps/api/src/services/admin-verifications'
import { calculateLeaderboard } from '../../../../apps/api/src/services/leaderboard'
import {
  createPendingRegistrationVerification,
  getPendingRegistrationVerification,
} from '../../../../apps/api/src/services/registration-verifications'
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
const pendingVerificationsPath = (limit = 100, offset = 0) =>
  `/api/v2/admin/user-verifications?limit=${limit}&offset=${offset}`

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
    const db = getDb()
    const first = {
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
      division: Object.keys(config.divisions)[0]!,
    }
    const second = {
      ...first,
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
    }

    await createPendingRegistrationVerification(db, first)
    await createPendingRegistrationVerification(db, second)

    const res = await request(app, pendingVerificationsPath(1, 0), {
      headers: {
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
    })

    const body = await expectResponse(res, GoodAdminUserVerificationsV2)
    expect(body.data.total).toBe(2)
    expect(body.data.verifications).toHaveLength(1)
    expect([first.email, second.email]).toContain(
      body.data.verifications[0].email
    )
  })

  test('keeps only one pending team email verification per email', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const db = getDb()
    const email = `${crypto.randomUUID()}@pending.test`
    const division = Object.keys(config.divisions)[0]!

    const first = await createPendingRegistrationVerification(db, {
      name: crypto.randomUUID(),
      email,
      division,
    })
    const secondName = crypto.randomUUID()
    const second = await createPendingRegistrationVerification(db, {
      name: secondName,
      email,
      division,
    })

    expect(first.id).not.toBe(second.id)
    expect(
      await getPendingRegistrationVerification(db, first.id)
    ).toBeUndefined()

    const res = await request(app, pendingVerificationsPath(), {
      headers: {
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
    })
    const body = await expectResponse(res, GoodAdminUserVerificationsV2)
    const forEmail = body.data.verifications.filter(v => v.email === email)
    expect(body.data.total).toBe(1)
    expect(forEmail).toHaveLength(1)
    expect(forEmail[0]).toMatchObject({ id: second.id, name: secondName })
  })

  test('verifies a stored pending team email verification token', async () => {
    const db = getDb()
    const pending = {
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
      division: Object.keys(config.divisions)[0]!,
    }
    const verification = await createPendingRegistrationVerification(
      db,
      pending
    )

    const infoRes = await request(
      app,
      `/api/v2/auth/verify-info?token=${encodeURIComponent(verification.token)}`,
      {}
    )
    const infoBody = await expectResponse(infoRes, GoodVerifyInfo)
    expect(infoBody.data).toMatchObject({
      kind: 'register',
      email: pending.email,
      name: pending.name,
    })

    const verifyRes = await request(app, '/api/v1/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifyToken: verification.token }),
    })
    await expectResponse(verifyRes, GoodRegister)

    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.email, pending.email))
    expect(created?.name).toBe(pending.name)
    expect(
      await getPendingRegistrationVerification(db, verification.id)
    ).toBeUndefined()
  })

  test('manually completes a pending team email verification', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const db = getDb()
    const pending = {
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
      division: Object.keys(config.divisions)[0]!,
    }
    const verification = await createPendingRegistrationVerification(
      db,
      pending
    )

    const res = await request(
      app,
      `/api/v2/admin/user-verifications/${verification.id}/complete`,
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

    const afterRes = await request(app, pendingVerificationsPath(), {
      headers: {
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
    })
    const afterBody = await expectResponse(
      afterRes,
      GoodAdminUserVerificationsV2
    )
    expect(afterBody.data.total).toBe(0)
    expect(afterBody.data.verifications).toHaveLength(0)
    expect(
      await getPendingRegistrationVerification(db, verification.id)
    ).toBeUndefined()
  })

  test('manual completion invalidates the original emailed verification link', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const db = getDb()
    const pending = {
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@pending.test`,
      division: Object.keys(config.divisions)[0]!,
    }
    const verification = await createPendingRegistrationVerification(
      db,
      pending
    )

    const completeRes = await request(
      app,
      `/api/v2/admin/user-verifications/${verification.id}/complete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )
    await expectResponse(completeRes, GoodAdminUserVerificationCompleteV2)

    expect(
      await getPendingRegistrationVerification(db, verification.id)
    ).toBeUndefined()

    const verifyInfoRes = await request(
      app,
      `/api/v2/auth/verify-info?token=${encodeURIComponent(verification.token)}`,
      {}
    )
    await expectResponse(verifyInfoRes, BadTokenVerification)

    const verifyRes = await request(app, '/api/v1/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifyToken: verification.token }),
    })

    await expectResponse(verifyRes, BadTokenVerification)
  })

  test('completing a pending team email verification keeps duplicate email pending', async () => {
    const admin = await generateRealTestUser(Permissions.usersWrite)
    const existing = await generateRealTestUser()
    const db = getDb()
    const pending = {
      name: crypto.randomUUID(),
      email: existing.user.email!,
      division: Object.keys(config.divisions)[0]!,
    }
    const verification = await createPendingRegistrationVerification(
      db,
      pending
    )

    const res = await request(
      app,
      `/api/v2/admin/user-verifications/${verification.id}/complete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      }
    )

    await expectResponse(res, BadKnownEmail)

    const afterRes = await request(app, pendingVerificationsPath(), {
      headers: {
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
    })
    const afterBody = await expectResponse(
      afterRes,
      GoodAdminUserVerificationsV2
    )
    expect(afterBody.data.verifications.map(v => v.id)).toContain(
      verification.id
    )
    expect(
      await getPendingRegistrationVerification(db, verification.id)
    ).toMatchObject({ email: pending.email })
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

  test('resending a pending team email verification requires email provider', async () => {
    const oldEmail = config.email
    config.email = undefined

    try {
      const admin = await generateRealTestUser(Permissions.usersWrite)
      const db = getDb()
      const pending = {
        name: crypto.randomUUID(),
        email: `${crypto.randomUUID()}@pending.test`,
        division: Object.keys(config.divisions)[0]!,
      }
      const verification = await createPendingRegistrationVerification(
        db,
        pending
      )

      const res = await request(
        app,
        `/api/v2/admin/user-verifications/${verification.id}/resend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
          },
        }
      )

      await expectResponse(res, BadEndpoint)

      const afterRes = await request(app, pendingVerificationsPath(), {
        headers: {
          Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
        },
      })
      const afterBody = await expectResponse(
        afterRes,
        GoodAdminUserVerificationsV2
      )
      expect(afterBody.data.verifications.map(v => v.id)).toContain(
        verification.id
      )
    } finally {
      config.email = oldEmail
    }
  })

  test('resends a pending team email verification with the stored token', async () => {
    const oldEmail = config.email
    config.email = {
      provider: { name: 'emails/smtp', options: { smtpUrl: 'smtp://test' } },
      from: 'noreply@example.com',
    }

    try {
      const db = getDb()
      const pending = {
        name: crypto.randomUUID(),
        email: `${crypto.randomUUID()}@pending.test`,
        division: Object.keys(config.divisions)[0]!,
      }
      const verification = await createPendingRegistrationVerification(
        db,
        pending
      )
      let sentToken: string | undefined

      const result = await resendPendingTeamVerification(
        db,
        verification.id,
        async (_email, _kind, token) => {
          sentToken = token
        }
      )

      expect(result.success).toBe(true)
      if (!result.success) {
        throw new Error(`Unexpected resend failure: ${result.error}`)
      }
      expect(result.verificationId).toBe(verification.id)
      expect(sentToken).toBe(verification.token)
      expect(
        await getPendingRegistrationVerification(db, verification.id)
      ).toMatchObject({
        email: pending.email,
        name: pending.name,
      })
    } finally {
      config.email = oldEmail
    }
  })

  test('keeps the stored pending verification when resend delivery fails', async () => {
    const oldEmail = config.email
    config.email = {
      provider: { name: 'emails/smtp', options: { smtpUrl: 'smtp://test' } },
      from: 'noreply@example.com',
    }

    try {
      const db = getDb()
      const pending = {
        name: crypto.randomUUID(),
        email: `${crypto.randomUUID()}@pending.test`,
        division: Object.keys(config.divisions)[0]!,
      }
      const verification = await createPendingRegistrationVerification(
        db,
        pending
      )

      await expect(
        resendPendingTeamVerification(db, verification.id, async () => {
          throw new Error('delivery failed')
        })
      ).rejects.toThrow('delivery failed')

      expect(
        await getPendingRegistrationVerification(db, verification.id)
      ).toMatchObject({
        email: pending.email,
        name: pending.name,
        token: verification.token,
      })
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
