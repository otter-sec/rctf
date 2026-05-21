import { createHmac } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  api,
  cleanupChallenge,
  cleanupUser,
  createDecayChallenge,
  createDynamicChallenge,
  makeAdmin,
  registerUser,
  signAndPushScores,
  testId,
  type TestUser,
} from '../lib/harness'

const SECRET = 'payload-secret'

describe('webhook payload validation', () => {
  let admin: TestUser
  let dynamicChallengeId: string
  let decayChallengeId: string

  beforeAll(async () => {
    admin = await registerUser(testId('admin'))
    await makeAdmin(admin)
    dynamicChallengeId = testId('chall-dyn')
    decayChallengeId = testId('chall-decay')
    await createDynamicChallenge(admin, dynamicChallengeId, {
      transport: 'webhook',
      secret: SECRET,
    })
    await createDecayChallenge(admin, decayChallengeId, {
      name: 'decay-target',
      description: '',
      category: 'decay',
      author: 'test',
      flag: 'flag{decay}',
      points: { min: 100, max: 500 },
    })
  })

  afterAll(async () => {
    await cleanupChallenge(dynamicChallengeId)
    await cleanupChallenge(decayChallengeId)
    await cleanupUser(admin)
  })

  test('non-dynamic (decay) challenge -> badChallenge', async () => {
    const res = await signAndPushScores(decayChallengeId, SECRET, {
      scores: [],
    })
    expect(res.status).toBe(404)
    expect((res.body as { kind?: string }).kind).toBe('badChallenge')
  })
})
