import { challenges } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import {
  BadSignature,
  ChallengeScoringKind,
  DynamicScoringTransport,
} from '@rctf/types'
import { eq } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppEnv } from '../lib/app-env'
import { timingSafeEqual } from '../util/timing-safe-equal'

const MAX_SKEW_MS = 5 * 60 * 1000
const reject = (c: Context<AppEnv>) =>
  c.json(
    { kind: BadSignature.kind, message: BadSignature.message },
    BadSignature.status as ContentfulStatusCode
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

  c.set('dynamicChallenge', challenge)
  await next()
}
