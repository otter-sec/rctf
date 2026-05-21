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

const SECRET = 'modes-secret'

describe('webhook modes (replacement vs cumulative)', () => {
  let admin: TestUser
  let userA: TestUser
  let userB: TestUser
  let challengeId: string

  beforeAll(async () => {
    admin = await registerUser(testId('admin'))
    await makeAdmin(admin)
    userA = await registerUser(testId('alice'))
    userB = await registerUser(testId('bob'))
    challengeId = testId('chall-mode')
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

  test('replacement: missing user gets zeroed', async () => {
    // seed both with non-zero scores
    let res = await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: userA.id, points: 100 },
        { userId: userB.id, points: 200 },
      ],
      mode: 'replacement',
    })
    expect(res.status).toBe(200)

    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 100 &&
        entries.find(e => e.id === userB.id)?.score === 200
    )

    // now send a replacement that only includes userA → userB should be dropped
    res = await signAndPushScores(challengeId, SECRET, {
      scores: [{ userId: userA.id, points: 150 }],
      mode: 'replacement',
    })
    expect(res.status).toBe(200)

    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 150 &&
        entries.find(e => e.id === userB.id) === undefined
    )
  })

  test('cumulative: omitted user keeps their score', async () => {
    await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: userA.id, points: 50 },
        { userId: userB.id, points: 75 },
      ],
      mode: 'replacement',
    })
    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 50 &&
        entries.find(e => e.id === userB.id)?.score === 75
    )

    // cumulative update touching only userA → userB unchanged
    await signAndPushScores(challengeId, SECRET, {
      scores: [{ userId: userA.id, points: 999 }],
      mode: 'cumulative',
    })

    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 999 &&
        entries.find(e => e.id === userB.id)?.score === 75
    )
  })

  test('default mode (omitted) behaves as replacement', async () => {
    await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: userA.id, points: 11 },
        { userId: userB.id, points: 22 },
      ],
      mode: 'replacement',
    })
    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 11 &&
        entries.find(e => e.id === userB.id)?.score === 22
    )

    // omit mode entirely → server default is replacement (DynamicScoresMode.REPLACEMENT)
    await signAndPushScores(challengeId, SECRET, {
      scores: [{ userId: userA.id, points: 33 }],
    })

    await awaitLeaderboard(
      entries =>
        entries.find(e => e.id === userA.id)?.score === 33 &&
        entries.find(e => e.id === userB.id) === undefined
    )
  })
})
