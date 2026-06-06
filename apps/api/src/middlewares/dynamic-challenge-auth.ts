import { challenges } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import {
  BadReplayedRequest,
  BadSignature,
  ChallengeScoringKind,
  DynamicScoringTransport,
} from '@rctf/types'
import { eq } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import {
  clearWebhookSeen,
  markWebhookSeen,
  MAX_SKEW_MS,
} from '../cache/webhook-dedup'
import type { AppEnv } from '../lib/app-env'
import { timingSafeEqual } from '../util/timing-safe-equal'

type RejectResponse = { kind: string; message: string; status: number }

const reject = (c: Context<AppEnv>, response: RejectResponse = BadSignature) =>
  c.json(
    { kind: response.kind, message: response.message },
    response.status as ContentfulStatusCode
  )

export const dynamicChallengeAuthMiddleware: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
  const id = c.req.param('id')
  if (!id) {
    return reject(c)
  }

  const challenge = await c.var.db
    .select({ id: challenges.id, data: challenges.data })
    .from(challenges)
    .where(eq(challenges.id, id))
    .limit(1)
    .then(takeUnique)

  const scoring = challenge?.data.scoring
  if (
    !challenge ||
    !scoring ||
    scoring.kind !== ChallengeScoringKind.DYNAMIC ||
    scoring.source?.transport !== DynamicScoringTransport.WEBHOOK ||
    !scoring.source?.secret
  ) {
    return reject(c)
  }

  const timestampHeader = c.req.header('X-RCTF-Timestamp')
  const signatureHeader = c.req.header('X-RCTF-Signature')
  const timestamp = Number(timestampHeader)
  if (
    !timestampHeader ||
    !signatureHeader ||
    !Number.isInteger(timestamp) ||
    Math.abs(Date.now() - timestamp) > MAX_SKEW_MS
  ) {
    return reject(c)
  }

  // subsequent json() call parses from cache
  const raw = await c.req.text()
  const hasher = new Bun.CryptoHasher('sha256', scoring.source.secret)
  hasher.update(`${timestamp}.${raw}`)
  const expected = `sha256=${hasher.digest('hex')}`
  if (!timingSafeEqual(signatureHeader, expected)) {
    return reject(c)
  }

  const fresh = await markWebhookSeen(c.var.redis, challenge.id, expected)
  if (!fresh) {
    return reject(c, BadReplayedRequest)
  }

  const clearSeen = () =>
    clearWebhookSeen(c.var.redis, challenge.id, expected).catch(() => {})

  c.set('dynamicChallenge', challenge)
  try {
    await next()
  } catch (err) {
    await clearSeen()
    throw err
  }

  if (c.res.status < 200 || c.res.status >= 300) {
    await clearSeen()
  }
}
