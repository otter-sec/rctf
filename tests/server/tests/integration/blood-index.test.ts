import { config } from '@rctf/config'
import { createDatabase, solves } from '@rctf/db'
import { GoodUserDataV2, GoodUserSelfDataV2 } from '@rctf/types'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Hono } from 'hono'
import { getApp, request } from '../../app'
import {
  expectResponse,
  generateAuthToken,
  generateChallenge,
  generateRealTestUser,
} from '../../util'

let app: Hono<any>
const cleanups: Array<() => Promise<void>> = []

beforeAll(async () => {
  app = await getApp()
})

afterAll(async () => {
  for (const cleanup of cleanups) {
    await cleanup()
  }
})

describe('bloodIndex', () => {
  test('returns correct bloodIndex (other profile)', async () => {
    const db = createDatabase(config.database.sql).db

    const { user: user1, cleanup: c1 } = await generateRealTestUser()
    const { user: user2, cleanup: c2 } = await generateRealTestUser()
    const { user: user3, cleanup: c3 } = await generateRealTestUser()
    const { user: user4, cleanup: c4 } = await generateRealTestUser()
    cleanups.push(c1, c2, c3, c4)

    const { challenge, cleanup: cc } = await generateChallenge()
    cleanups.push(cc)

    const now = Date.now()
    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user1.id,
        createdat: new Date(now - 40000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user2.id,
        createdat: new Date(now - 30000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user3.id,
        createdat: new Date(now - 20000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: user4.id,
        createdat: new Date(now - 10000).toISOString(),
      },
    ])

    const res1 = await request(app, `/api/v2/users/${user1.id}`, {
      method: 'GET',
    })
    const body1 = await expectResponse(res1, GoodUserDataV2)
    const solve1 = body1.data.solves.find((s: any) => s.id === challenge.id)
    expect(solve1.bloodIndex).toBe(0) // first blood

    const res2 = await request(app, `/api/v2/users/${user2.id}`, {
      method: 'GET',
    })
    const body2 = await expectResponse(res2, GoodUserDataV2)
    const solve2 = body2.data.solves.find((s: any) => s.id === challenge.id)
    expect(solve2.bloodIndex).toBe(1) // second blood

    const res3 = await request(app, `/api/v2/users/${user3.id}`, {
      method: 'GET',
    })
    const body3 = await expectResponse(res3, GoodUserDataV2)
    const solve3 = body3.data.solves.find((s: any) => s.id === challenge.id)
    expect(solve3.bloodIndex).toBe(2) // third blood

    const res4 = await request(app, `/api/v2/users/${user4.id}`, {
      method: 'GET',
    })
    const body4 = await expectResponse(res4, GoodUserDataV2)
    const solve4 = body4.data.solves.find((s: any) => s.id === challenge.id)
    expect(solve4.bloodIndex).toBeNull() // not a blood
  })

  test('returns correct bloodIndex (self profile)', async () => {
    const db = createDatabase(config.database.sql).db

    const { user: firstSolver, cleanup: c1 } = await generateRealTestUser()
    const { user: secondSolver, cleanup: c2 } = await generateRealTestUser()
    const { user: fourthSolver, cleanup: c3 } = await generateRealTestUser()
    cleanups.push(c1, c2, c3)

    const { challenge, cleanup: cc } = await generateChallenge()
    cleanups.push(cc)

    const now = Date.now()
    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: firstSolver.id,
        createdat: new Date(now - 40000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: secondSolver.id,
        createdat: new Date(now - 30000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: challenge.id,
        userid: fourthSolver.id,
        createdat: new Date(now - 10000).toISOString(),
      },
    ])

    const token1 = await generateAuthToken(firstSolver.id)
    const res1 = await request(app, '/api/v2/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` },
    })
    const body1 = await expectResponse(res1, GoodUserSelfDataV2)
    const solve1 = body1.data.solves.find((s: any) => s.id === challenge.id)
    expect(solve1.bloodIndex).toBe(0) // first blood

    const token2 = await generateAuthToken(secondSolver.id)
    const res2 = await request(app, '/api/v2/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    })
    const body2 = await expectResponse(res2, GoodUserSelfDataV2)
    const solve2 = body2.data.solves.find((s: any) => s.id === challenge.id)
    expect(solve2.bloodIndex).toBe(1) // second blood

    const token4 = await generateAuthToken(fourthSolver.id)
    const res4 = await request(app, '/api/v2/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token4}` },
    })
    const body4 = await expectResponse(res4, GoodUserSelfDataV2)
    const solve4 = body4.data.solves.find((s: any) => s.id === challenge.id)
    expect(solve4.bloodIndex).toBe(2) // third blood
  })

  test('bloodIndex correct across multiple challenges', async () => {
    const db = createDatabase(config.database.sql).db

    const { user: firstSolver, cleanup: c1 } = await generateRealTestUser()
    const { user: lateSolver, cleanup: c2 } = await generateRealTestUser()
    cleanups.push(c1, c2)

    const { challenge: chall1, cleanup: cc1 } = await generateChallenge()
    const { challenge: chall2, cleanup: cc2 } = await generateChallenge()
    cleanups.push(cc1, cc2)

    const now = Date.now()
    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: chall1.id,
        userid: firstSolver.id,
        createdat: new Date(now - 30000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: chall2.id,
        userid: firstSolver.id,
        createdat: new Date(now - 25000).toISOString(),
      },
    ])

    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: chall1.id,
        userid: lateSolver.id,
        createdat: new Date(now - 10000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: chall2.id,
        userid: lateSolver.id,
        createdat: new Date(now - 5000).toISOString(),
      },
    ])

    const res = await request(app, `/api/v2/users/${lateSolver.id}`, {
      method: 'GET',
    })
    const body = await expectResponse(res, GoodUserDataV2)
    const s1 = body.data.solves.find((s: any) => s.id === chall1.id)
    const s2 = body.data.solves.find((s: any) => s.id === chall2.id)
    expect(s1.bloodIndex).toBe(1) // second solver
    expect(s2.bloodIndex).toBe(1) // second solver

    const token = await generateAuthToken(lateSolver.id)
    const resMe = await request(app, '/api/v2/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    const bodyMe = await expectResponse(resMe, GoodUserSelfDataV2)
    const s1Me = bodyMe.data.solves.find((s: any) => s.id === chall1.id)
    const s2Me = bodyMe.data.solves.find((s: any) => s.id === chall2.id)
    expect(s1Me.bloodIndex).toBe(1) // second solver
    expect(s2Me.bloodIndex).toBe(1) // second solver
  })
})
