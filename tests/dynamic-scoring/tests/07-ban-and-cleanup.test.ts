import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  api,
  awaitLeaderboard,
  cleanupChallenge,
  cleanupUser,
  createDynamicChallenge,
  db,
  makeAdmin,
  registerUser,
  setUserBanned,
  signAndPushScores,
  testId,
  type TestUser,
} from '../lib/harness'

const SECRET = 'ban-secret'

describe('ban + cleanup behavior', () => {
  let admin: TestUser
  let alice: TestUser
  let bob: TestUser
  let challengeId: string

  beforeAll(async () => {
    admin = await registerUser(testId('admin'))
    await makeAdmin(admin)
    alice = await registerUser(testId('alice'))
    bob = await registerUser(testId('bob'))
    challengeId = testId('chall-ban')
    await createDynamicChallenge(admin, challengeId, {
      transport: 'webhook',
      secret: SECRET,
    })

    await signAndPushScores(challengeId, SECRET, {
      scores: [
        { userId: alice.id, points: 400 },
        { userId: bob.id, points: 600 },
      ],
    })
    await awaitLeaderboard(
      e =>
        e.find(x => x.id === alice.id)?.score === 400 &&
        e.find(x => x.id === bob.id)?.score === 600
    )
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(alice)
    await cleanupUser(bob)
    await cleanupUser(admin)
  })

  test('banned user drops off the leaderboard', async () => {
    await setUserBanned(alice, true)

    await awaitLeaderboard(
      e =>
        e.find(x => x.id === alice.id) === undefined &&
        e.find(x => x.id === bob.id)?.score === 600
    )
  })

  test('unbanning restores the user', async () => {
    await setUserBanned(alice, false)

    await awaitLeaderboard(
      e =>
        e.find(x => x.id === alice.id)?.score === 400 &&
        e.find(x => x.id === bob.id)?.score === 600
    )
  })

  test('deleting the challenge cascades solves + score_events', async () => {
    const before = await db<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM solves WHERE challengeid = ${challengeId}
    `
    expect(before[0]?.count ?? 0).toBeGreaterThan(0)

    const res = await api(`/api/v1/admin/challs/${challengeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${admin.token}` },
    })
    expect(res.status).toBe(200)

    const afterSolves = await db<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM solves WHERE challengeid = ${challengeId}
    `
    const afterEvents = await db<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM score_events WHERE challengeid = ${challengeId}
    `
    expect(afterSolves[0]?.count).toBe(0)
    expect(afterEvents[0]?.count).toBe(0)
  })
})
