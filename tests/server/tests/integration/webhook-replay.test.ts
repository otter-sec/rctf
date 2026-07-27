import { createHmac } from 'node:crypto'
import { config } from '@rctf/config'
import {
  challenges,
  ChallengeScoringKind,
  createDatabase,
  DynamicScoringTransport,
  scoreEvents,
  type ChallengeData,
} from '@rctf/db'
import {
  BadBody,
  BadReplayedRequest,
  BadSignature,
  GoodDynamicScores,
} from '@rctf/types'
import { beforeEach, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import {
  clearWebhookSeen,
  markWebhookSeen,
} from '../../../../apps/api/src/cache/webhook-dedup'
import type { AppEnv } from '../../../../apps/api/src/lib/app-env'
import { dynamicChallengeAuthMiddleware } from '../../../../apps/api/src/middlewares/dynamic-challenge-auth'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { getApp, request } from '../../app'
import { clearDatabase, expectResponse, generateRealTestUser } from '../../util'

const getDb = () => createDatabase(config.database.sql).db

const SECRET = 'replay-test-secret'

const dynamicData = (secret = SECRET): ChallengeData => ({
  name: 'dyn-' + crypto.randomUUID(),
  description: '',
  category: 'dynamic',
  author: 'test',
  files: [],
  flags: [],
  tiebreakEligible: true,
  points: { min: 0, max: 0 },
  scoring: {
    kind: ChallengeScoringKind.DYNAMIC,
    source: {
      transport: DynamicScoringTransport.WEBHOOK,
      secret,
    },
  },
})

const createDynamicChallenge = async (secret = SECRET): Promise<string> => {
  const id = crypto.randomUUID()
  await getDb()
    .insert(challenges)
    .values({ id, data: dynamicData(secret) })
  return id
}

const sign = (
  secret: string,
  timestamp: number,
  challengeId: string,
  body: string
) =>
  `sha256=${createHmac('sha256', secret).update(`${timestamp}.${challengeId}.${body}`).digest('hex')}`

const signedInit = (
  challengeId: string,
  body: string,
  timestamp: number,
  secret = SECRET
): RequestInit => ({
  method: 'POST',
  body,
  headers: {
    'Content-Type': 'application/json',
    'X-RCTF-Timestamp': timestamp.toString(),
    'X-RCTF-Signature': sign(secret, timestamp, challengeId, body),
  },
})

const push = async (
  challengeId: string,
  body: string,
  timestamp: number,
  signedFor = challengeId
) => {
  const app = await getApp()
  return await request(
    app,
    `/api/v2/challs/${challengeId}/scores`,
    signedInit(signedFor, body, timestamp)
  )
}

describe('webhook replay protection', () => {
  beforeEach(async () => {
    await clearDatabase()
    await (await createRedis()).flushdb()
  })

  test('replaying the same signed request -> badReplayedRequest', async () => {
    const challengeId = await createDynamicChallenge()
    const { user } = await generateRealTestUser()
    const body = JSON.stringify({ scores: [{ userId: user.id, points: 100 }] })
    const ts = Date.now()

    await expectResponse(await push(challengeId, body, ts), GoodDynamicScores)
    await expectResponse(await push(challengeId, body, ts), BadReplayedRequest)

    const events = await getDb()
      .select()
      .from(scoreEvents)
      .where(eq(scoreEvents.challengeid, challengeId))
    expect(events.length).toBe(1)
  })

  test('the same body with a fresh timestamp is accepted', async () => {
    const challengeId = await createDynamicChallenge()
    const body = JSON.stringify({ scores: [] })
    const ts = Date.now()

    await expectResponse(await push(challengeId, body, ts), GoodDynamicScores)
    await expectResponse(
      await push(challengeId, body, ts + 1),
      GoodDynamicScores
    )
  })

  test('a signature for one challenge is rejected on another sharing a secret', async () => {
    const challengeA = await createDynamicChallenge()
    const challengeB = await createDynamicChallenge()
    const body = JSON.stringify({ scores: [] })
    const ts = Date.now()

    await expectResponse(await push(challengeA, body, ts), GoodDynamicScores)
    await expectResponse(
      await push(challengeB, body, ts, challengeA),
      BadSignature
    )
  })

  test('a rejected (4xx) delivery does not consume the dedup slot', async () => {
    const challengeId = await createDynamicChallenge()
    const body = JSON.stringify({ scores: [{ userId: 1 }] })
    const ts = Date.now()

    await expectResponse(await push(challengeId, body, ts), BadBody)
    await expectResponse(await push(challengeId, body, ts), BadBody)
  })

  test('a failed (thrown) delivery does not consume the dedup slot', async () => {
    const challengeId = await createDynamicChallenge()
    const redis = await createRedis()
    const db = getDb()

    const app = new Hono<AppEnv>()
    app.use(async (c, next) => {
      c.set('db', db)
      c.set('redis', redis)
      await next()
    })
    app.onError((_err, c) => c.json({ kind: 'errorInternal' }, 500))

    let calls = 0
    app.post('/challs/:id/scores', dynamicChallengeAuthMiddleware, c => {
      calls += 1
      if (calls === 1) {
        throw new Error('boom')
      }
      return c.json({ ok: true })
    })

    const body = JSON.stringify({ scores: [] })
    const ts = Date.now()
    const path = `/challs/${challengeId}/scores`

    const first = await app.request(path, signedInit(challengeId, body, ts))
    expect(first.status).toBe(500)

    const second = await app.request(path, signedInit(challengeId, body, ts))
    expect(second.status).toBe(200)

    const third = await app.request(path, signedInit(challengeId, body, ts))
    await expectResponse(third, BadReplayedRequest)
    expect(calls).toBe(2)
  })

  test('markWebhookSeen/clearWebhookSeen round-trip', async () => {
    const redis = await createRedis()

    expect(await markWebhookSeen(redis, 'chall', 'sig')).toBe(true)
    expect(await markWebhookSeen(redis, 'chall', 'sig')).toBe(false)
    await clearWebhookSeen(redis, 'chall', 'sig')
    expect(await markWebhookSeen(redis, 'chall', 'sig')).toBe(true)
  })
})
