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
  let sharedSecretChallengeId: string | undefined

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
    if (sharedSecretChallengeId) {
      await cleanupChallenge(sharedSecretChallengeId)
    }
    await cleanupUser(admin)
  })

  test('valid signature -> goodDynamicScores', async () => {
    const res = await signAndPushScores(challengeId, SECRET, {
      scores: [],
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

  test('replayed request -> badReplayedRequest', async () => {
    const payload = { scores: [{ userId: crypto.randomUUID(), points: 1 }] }
    const timestamp = Date.now()

    const first = await signAndPushScores(challengeId, SECRET, payload, {
      timestamp,
    })
    expect(first.status).toBe(200)

    const second = await signAndPushScores(challengeId, SECRET, payload, {
      timestamp,
    })
    expect(second.status).toBe(409)
    expect((second.body as { kind?: string }).kind).toBe('badReplayedRequest')
  })

  test('same payload with a fresh timestamp -> goodDynamicScores', async () => {
    const payload = { scores: [{ userId: crypto.randomUUID(), points: 1 }] }
    const timestamp = Date.now()

    const first = await signAndPushScores(challengeId, SECRET, payload, {
      timestamp,
    })
    expect(first.status).toBe(200)

    const second = await signAndPushScores(challengeId, SECRET, payload, {
      timestamp: timestamp + 1,
    })
    expect(second.status).toBe(200)
    expect((second.body as { kind?: string }).kind).toBe('goodDynamicScores')
  })

  test('shared secret broadcast to another challenge -> goodDynamicScores', async () => {
    sharedSecretChallengeId = testId('chall-auth-shared')
    const created = await createDynamicChallenge(
      admin,
      sharedSecretChallengeId,
      { transport: 'webhook', secret: SECRET }
    )
    expect(created.status).toBe(200)

    const payload = { scores: [{ userId: crypto.randomUUID(), points: 1 }] }
    const timestamp = Date.now()

    const first = await signAndPushScores(challengeId, SECRET, payload, {
      timestamp,
    })
    expect(first.status).toBe(200)

    const second = await signAndPushScores(
      sharedSecretChallengeId,
      SECRET,
      payload,
      { timestamp }
    )
    expect(second.status).toBe(200)
    expect((second.body as { kind?: string }).kind).toBe('goodDynamicScores')
  })
})
