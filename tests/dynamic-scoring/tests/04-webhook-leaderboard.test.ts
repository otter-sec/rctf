import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  awaitLeaderboard,
  awaitYourScore,
  cleanupChallenge,
  cleanupUser,
  createDynamicChallenge,
  makeAdmin,
  registerUser,
  signAndPushScores,
  testId,
  type TestUser,
} from '../lib/harness'

const SECRET = 'leaderboard-secret'

describe('webhook leaderboard propagation', () => {
  let admin: TestUser
  let alice: TestUser
  let bob: TestUser
  let carol: TestUser
  let challengeId: string

  beforeAll(async () => {
    admin = await registerUser(testId('admin'))
    await makeAdmin(admin)
    alice = await registerUser(testId('alice'))
    bob = await registerUser(testId('bob'))
    carol = await registerUser(testId('carol'))
    challengeId = testId('chall-lb')
    await createDynamicChallenge(admin, challengeId, {
      transport: 'webhook',
      secret: SECRET,
    })
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(alice)
    await cleanupUser(bob)
    await cleanupUser(carol)
    await cleanupUser(admin)
  })

  test('ranks reflect per-team scores from feed', async () => {
    const res = await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: alice.id, points: 500 },
        { userId: bob.id, points: 1000 },
        { userId: carol.id, points: 250 },
      ],
    })
    expect(res.status).toBe(200)
    const data = (res.body as { data?: { inserted?: number } }).data
    expect(data?.inserted).toBe(3)

    const entries = await awaitLeaderboard(
      e =>
        e.find(x => x.id === bob.id)?.score === 1000 &&
        e.find(x => x.id === alice.id)?.score === 500 &&
        e.find(x => x.id === carol.id)?.score === 250
    )
    const ids = entries.slice(0, 3).map(e => e.id)
    expect(ids).toEqual([bob.id, alice.id, carol.id])
  })

  test('GET /api/v2/challs exposes yourScore per user', async () => {
    await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: alice.id, points: 42 },
        { userId: bob.id, points: 84 },
        { userId: carol.id, points: 0 },
      ],
    })
    await awaitYourScore(alice, challengeId, s => s === 42)
    await awaitYourScore(bob, challengeId, s => s === 84)
    // zero clears carol's score for this challenge
    await awaitYourScore(carol, challengeId, s => s === undefined)
  })

  test('unknown user IDs silently dropped', async () => {
    const res = await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: alice.id, points: 7 },
        { userId: '00000000-0000-0000-0000-000000000000', points: 9999 },
      ],
    })
    expect(res.status).toBe(200)
    const data = (
      res.body as { data?: { inserted?: number; updated?: number } }
    ).data
    // alice already had a row => update; ghost user => dropped => no insert/update
    expect((data?.inserted ?? 0) + (data?.updated ?? 0)).toBe(1)
  })
})
