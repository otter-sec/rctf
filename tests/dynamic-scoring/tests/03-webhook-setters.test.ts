import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  awaitLeaderboard,
  cleanupChallenge,
  cleanupUser,
  createDynamicChallenge,
  makeAdmin,
  registerUser,
  signAndPushScores,
  testId,
  type TestUser,
} from '../lib/harness'

const SECRET = 'setters-secret'

describe('webhook score setters', () => {
  let admin: TestUser
  let userA: TestUser
  let userB: TestUser
  let challengeId: string

  beforeAll(async () => {
    admin = await registerUser(testId('admin'))
    await makeAdmin(admin)
    userA = await registerUser(testId('alice'))
    userB = await registerUser(testId('bob'))
    challengeId = testId('chall-setter')
    await createDynamicChallenge(admin, challengeId, {
      transport: 'webhook',
      secret: SECRET,
    })
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(userA)
    await cleanupUser(userB)
    await cleanupUser(admin)
  })

  test('sets listed users and leaves omitted users unchanged', async () => {
    let res = await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: userA.id, points: 100 },
        { userId: userB.id, points: 200 },
      ],
    })
    expect(res.status).toBe(200)

    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 100 &&
        entries.find(e => e.id === userB.id)?.score === 200
    )

    res = await signAndPushScores(challengeId, SECRET, {
      scores: [{ userId: userA.id, points: 150 }],
    })
    expect(res.status).toBe(200)

    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 150 &&
        entries.find(e => e.id === userB.id)?.score === 200
    )
  })

  test('zero clears a listed user score', async () => {
    await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: userA.id, points: 50 },
        { userId: userB.id, points: 75 },
      ],
    })
    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 50 &&
        entries.find(e => e.id === userB.id)?.score === 75
    )

    await signAndPushScores(challengeId, SECRET, {
      scores: [{ userId: userB.id, points: 0 }],
    })

    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 50 &&
        entries.find(e => e.id === userB.id) === undefined
    )
  })

  test('updates are absolute score setters', async () => {
    await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: userA.id, points: 11 },
        { userId: userB.id, points: 22 },
      ],
    })
    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 11 &&
        entries.find(e => e.id === userB.id)?.score === 22
    )

    await signAndPushScores(challengeId, SECRET, {
      scores: [{ userId: userA.id, points: 33 }],
    })

    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 33 &&
        entries.find(e => e.id === userB.id)?.score === 22
    )
  })
})
