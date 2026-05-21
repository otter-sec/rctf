import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  api,
  cleanupChallenge,
  cleanupUser,
  createDynamicChallenge,
  makeAdmin,
  registerUser,
  signAndPushScores,
  testId,
  type TestUser,
} from '../lib/harness'

const SECRET = 'webhook-auth-secret-do-not-leak'

describe('webhook auth', () => {
  let admin: TestUser
  let challengeId: string

  beforeAll(async () => {
    admin = await registerUser(testId('admin'))
    await makeAdmin(admin)
    challengeId = testId('chall-auth')
    const res = await createDynamicChallenge(admin, challengeId, {
      transport: 'webhook',
      secret: SECRET,
    })
    expect(res.status).toBe(200)
  })

  afterAll(async () => {
    await cleanupChallenge(challengeId)
    await cleanupUser(admin)
  })

  test('valid signature -> goodDynamicScores', async () => {
    const res = await signAndPushScores(challengeId, SECRET, {
      scores: [],
      mode: 'cumulative',
    })
    expect(res.status).toBe(200)
    expect((res.body as { kind?: string }).kind).toBe('goodDynamicScores')
  })

  test('wrong secret -> badSignature', async () => {
    const res = await signAndPushScores(challengeId, 'wrong-secret', {
      scores: [],
    })
    expect(res.status).toBe(401)
    expect((res.body as { kind?: string }).kind).toBe('badSignature')
  })

  test('skewed timestamp -> badSignature', async () => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000
    const res = await signAndPushScores(
      challengeId,
      SECRET,
      { scores: [] },
      { timestamp: tenMinutesAgo }
    )
    expect(res.status).toBe(401)
    expect((res.body as { kind?: string }).kind).toBe('badSignature')
  })

  test('missing signature header -> badSignature', async () => {
    const res = await api(`/api/v2/challs/${challengeId}/scores`, {
      method: 'POST',
      body: { scores: [] },
      headers: { 'X-RCTF-Timestamp': Date.now().toString() },
    })
    expect(res.status).toBe(401)
    expect((res.body as { kind?: string }).kind).toBe('badSignature')
  })

  test('missing timestamp header -> badSignature', async () => {
    const res = await api(`/api/v2/challs/${challengeId}/scores`, {
      method: 'POST',
      body: { scores: [] },
      headers: { 'X-RCTF-Signature': 'sha256=deadbeef' },
    })
    expect(res.status).toBe(401)
    expect((res.body as { kind?: string }).kind).toBe('badSignature')
  })
})
