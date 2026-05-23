import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  awaitLeaderboard,
  cleanupChallenge,
  cleanupUser,
  createDecayChallenge,
  createDynamicChallenge,
  makeAdmin,
  registerUser,
  signAndPushScores,
  submitFlag,
  testId,
  type TestUser,
} from '../lib/harness'

const SECRET = 'mixed-secret'

describe('mixed decay + dynamic scoring', () => {
  let admin: TestUser
  let alice: TestUser
  let decayId: string
  let dynamicId: string

  beforeAll(async () => {
    admin = await registerUser(testId('admin'))
    await makeAdmin(admin)
    alice = await registerUser(testId('alice'))
    decayId = testId('chall-decay')
    dynamicId = testId('chall-dyn')
    await createDecayChallenge(admin, decayId, {
      name: 'decay-mixed',
      description: '',
      category: 'mixed',
      author: 'test',
      flag: 'flag{decay-mixed}',
      points: { min: 100, max: 500 },
    })
    await createDynamicChallenge(admin, dynamicId, {
      transport: 'webhook',
      secret: SECRET,
    })
  })

  afterAll(async () => {
    await cleanupChallenge(decayId)
    await cleanupChallenge(dynamicId)
    await cleanupUser(alice)
    await cleanupUser(admin)
  })

  test('user.score sums decay + dynamic contributions', async () => {
    const solve = await submitFlag(alice, decayId, 'flag{decay-mixed}')
    expect(solve.status).toBe(200)
    expect((solve.body as { kind?: string }).kind).toBe('goodFlag')

    await awaitLeaderboard(
      e => (e.find(x => x.id === alice.id)?.score ?? 0) > 0
    )

    await signAndPushScores(dynamicId, SECRET, {
      scores: [{ userId: alice.id, points: 250 }],
    })

    await awaitLeaderboard(e => {
      const entry = e.find(x => x.id === alice.id)
      return entry !== undefined && entry.score >= 250 + 1
    })
  })

  test('flag submission rejected for dynamic challenge', async () => {
    const res = await submitFlag(alice, dynamicId, 'anything')
    expect(res.status).toBe(404)
    expect((res.body as { kind?: string }).kind).toBe('badChallenge')
  })
})
