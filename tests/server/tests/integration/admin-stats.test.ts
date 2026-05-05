import { config } from '@rctf/config'
import { challenges, createDatabase, solves, users } from '@rctf/db'
import { BadPerms, GoodAdminStatsV2, Permissions } from '@rctf/types'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  clearDatabase,
  expectResponse,
  generateAuthToken,
  generateChallenge,
  generateChallengeWithReleaseTime,
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

describe('admin stats', () => {
  test('returns aggregate competition statistics', async () => {
    const admin = await generateRealTestUser(Permissions.challsRead)
    const solver = await generateRealTestUser()
    const banned = await generateRealTestUser()
    const visible = await generateChallenge()
    const hidden = await generateChallenge()
    await generateChallengeWithReleaseTime(Date.now() + 60_000)
    const db = getDb()

    const [hiddenRow] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, hidden.challenge.id))

    await db
      .update(challenges)
      .set({ data: { ...hiddenRow!.data, hidden: true } })
      .where(eq(challenges.id, hidden.challenge.id))

    await db
      .update(users)
      .set({
        banned: true,
      })
      .where(eq(users.id, banned.user.id))

    await db
      .update(users)
      .set({
        score: 500,
        globalRank: 1,
        divisionRank: 1,
      })
      .where(eq(users.id, solver.user.id))

    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: visible.challenge.id,
        userid: solver.user.id,
        createdat: new Date(config.startTime + 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: visible.challenge.id,
        userid: banned.user.id,
        createdat: new Date(config.startTime + 2000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: hidden.challenge.id,
        userid: solver.user.id,
        createdat: new Date(config.startTime + 3000).toISOString(),
      },
    ])

    const res = await request(app, '/api/v2/admin/stats', {
      headers: {
        Authorization: `Bearer ${await generateAuthToken(admin.user.id)}`,
      },
    })

    const body = await expectResponse(res, GoodAdminStatsV2)
    expect(body.data.teams).toEqual({
      total: 3,
      active: 2,
      banned: 1,
      admins: 1,
      scored: 1,
    })
    expect(body.data.challenges).toEqual({
      total: 3,
      visible: 1,
      hidden: 1,
      scheduled: 1,
      solved: 2,
      unsolved: 1,
    })
    expect(body.data.solves.total).toBe(3)
    expect(body.data.solves.accepted).toBe(2)
    expect(body.data.solves.scoreboard).toBe(1)
    expect(body.data.solves.banned).toBe(1)
    expect(body.data.scores.highest).toBe(500)
    expect(body.data.topTeams[0]?.id).toBe(solver.user.id)
    expect(body.data.recentSolves).toHaveLength(2)

    const visibleChallengeStats = body.data.topChallenges.find(
      (challenge: { id: string }) => challenge.id === visible.challenge.id
    )
    expect(visibleChallengeStats?.solveCount).toBe(1)
  })

  test('requires challenge read permission', async () => {
    const user = await generateRealTestUser()

    const res = await request(app, '/api/v2/admin/stats', {
      headers: {
        Authorization: `Bearer ${await generateAuthToken(user.user.id)}`,
      },
    })

    await expectResponse(res, BadPerms)
  })
})
