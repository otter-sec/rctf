import {
  BadAlreadySolvedChallenge,
  GoodFlag,
  GoodUserDataV2,
} from '@rctf/types'
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

const submitFlag = async (
  challengeId: string,
  flag: string,
  userId: string
) => {
  const authToken = await generateAuthToken(userId)
  return request(app, `/api/v1/challs/${challengeId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ flag }),
  })
}

const getBloodIndex = async (userId: string, challengeId: string) => {
  const res = await request(app, `/api/v2/users/${userId}`, {
    method: 'GET',
  })
  const body = await expectResponse(res, GoodUserDataV2)
  const solve = body.data.solves.find((s: any) => s.id === challengeId)
  return solve?.bloodIndex ?? null
}

describe('blood detection via flag submission', () => {
  test('sequential submissions produce correct blood numbers', async () => {
    const { user: user1, cleanup: c1 } = await generateRealTestUser()
    const { user: user2, cleanup: c2 } = await generateRealTestUser()
    const { user: user3, cleanup: c3 } = await generateRealTestUser()
    const { user: user4, cleanup: c4 } = await generateRealTestUser()
    cleanups.push(c1, c2, c3, c4)

    const { challenge, cleanup: cc } = await generateChallenge()
    cleanups.push(cc)

    await expectResponse(
      await submitFlag(challenge.id, challenge.flag, user1.id),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(challenge.id, challenge.flag, user2.id),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(challenge.id, challenge.flag, user3.id),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(challenge.id, challenge.flag, user4.id),
      GoodFlag
    )

    expect(await getBloodIndex(user1.id, challenge.id)).toBe(0) // first blood
    expect(await getBloodIndex(user2.id, challenge.id)).toBe(1) // second blood
    expect(await getBloodIndex(user3.id, challenge.id)).toBe(2) // third blood
    expect(await getBloodIndex(user4.id, challenge.id)).toBeNull() // not a blood
  })

  test('first submission is always first blood', async () => {
    const { user, cleanup: c1 } = await generateRealTestUser()
    cleanups.push(c1)

    const { challenge, cleanup: cc } = await generateChallenge()
    cleanups.push(cc)

    await expectResponse(
      await submitFlag(challenge.id, challenge.flag, user.id),
      GoodFlag
    )

    expect(await getBloodIndex(user.id, challenge.id)).toBe(0)
  })

  test('blood numbers are per-challenge', async () => {
    const { user: user1, cleanup: c1 } = await generateRealTestUser()
    const { user: user2, cleanup: c2 } = await generateRealTestUser()
    cleanups.push(c1, c2)

    const { challenge: chall1, cleanup: cc1 } = await generateChallenge()
    const { challenge: chall2, cleanup: cc2 } = await generateChallenge()
    cleanups.push(cc1, cc2)

    await expectResponse(
      await submitFlag(chall1.id, chall1.flag, user1.id),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(chall2.id, chall2.flag, user2.id),
      GoodFlag
    )

    await expectResponse(
      await submitFlag(chall1.id, chall1.flag, user2.id),
      GoodFlag
    )
    await expectResponse(
      await submitFlag(chall2.id, chall2.flag, user1.id),
      GoodFlag
    )

    expect(await getBloodIndex(user1.id, chall1.id)).toBe(0)
    expect(await getBloodIndex(user1.id, chall2.id)).toBe(1)
    expect(await getBloodIndex(user2.id, chall1.id)).toBe(1)
    expect(await getBloodIndex(user2.id, chall2.id)).toBe(0)
  })

  test('duplicate submission does not affect blood ordering', async () => {
    const { user: user1, cleanup: c1 } = await generateRealTestUser()
    const { user: user2, cleanup: c2 } = await generateRealTestUser()
    cleanups.push(c1, c2)

    const { challenge, cleanup: cc } = await generateChallenge()
    cleanups.push(cc)

    await expectResponse(
      await submitFlag(challenge.id, challenge.flag, user1.id),
      GoodFlag
    )

    await expectResponse(
      await submitFlag(challenge.id, challenge.flag, user1.id),
      BadAlreadySolvedChallenge
    )

    await expectResponse(
      await submitFlag(challenge.id, challenge.flag, user2.id),
      GoodFlag
    )

    expect(await getBloodIndex(user1.id, challenge.id)).toBe(0)
    expect(await getBloodIndex(user2.id, challenge.id)).toBe(1)
  })

  test('concurrent submissions produce unique blood numbers', async () => {
    const userCount = 4
    const usersData = await Promise.all(
      Array.from({ length: userCount }, () => generateRealTestUser())
    )
    cleanups.push(...usersData.map(u => u.cleanup))

    const { challenge, cleanup: cc } = await generateChallenge()
    cleanups.push(cc)

    const results = await Promise.all(
      usersData.map(({ user }) =>
        submitFlag(challenge.id, challenge.flag, user.id)
      )
    )

    for (const res of results) {
      await expectResponse(res, GoodFlag)
    }

    const bloodIndices = await Promise.all(
      usersData.map(({ user }) => getBloodIndex(user.id, challenge.id))
    )

    const bloods = bloodIndices.filter((i): i is number => i !== null).sort()
    expect(bloods).toEqual([0, 1, 2])

    const nullCount = bloodIndices.filter((i): i is null => i === null).length
    expect(nullCount).toBe(1)
  })
})
