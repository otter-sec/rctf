import { challenges } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { BadChallenge, BadSignature, ChallengeScoringKind } from '@rctf/types'
import { eq } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AppEnv } from '../lib/app-env'
import { timingSafeEqual } from '../util/timing-safe-equal'

const MAX_SKEW_MS = 5 * 60 * 1000

const hmacHex = (secret: string, payload: string): string => {
  const hasher = new Bun.CryptoHasher('sha256', secret)
  hasher.update(payload)
  return hasher.digest('hex')
}

const respondBadChallenge = (c: Parameters<MiddlewareHandler<AppEnv>>[0]) =>
  c.json(
    { kind: BadChallenge.kind, message: BadChallenge.message },
    BadChallenge.status as ContentfulStatusCode
  )

const respondBadSignature = (c: Parameters<MiddlewareHandler<AppEnv>>[0]) =>
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
    return respondBadChallenge(c)
  }

  const challenge = await c.var.db
    .select({ id: challenges.id, data: challenges.data })
    .from(challenges)
    .where(eq(challenges.id, id))
    .limit(1)
    .then(takeUnique)

  if (!challenge) {
    return respondBadChallenge(c)
  }

  const scoring = challenge.data.scoring
  if (
    !scoring ||
    scoring.kind !== ChallengeScoringKind.DYNAMIC ||
    !scoring.source?.secret
  ) {
    return respondBadChallenge(c)
  }

  const timestampHeader = c.req.header('X-RCTF-Timestamp')
  const signatureHeader = c.req.header('X-RCTF-Signature')
  if (!timestampHeader || !signatureHeader) {
    return respondBadSignature(c)
  }

  const timestamp = Number.parseInt(timestampHeader, 10)
  if (!Number.isFinite(timestamp)) {
    return respondBadSignature(c)
  }
  if (Math.abs(Date.now() - timestamp) > MAX_SKEW_MS) {
    return respondBadSignature(c)
  }

  // subsequent json() call parses from cache
  const raw = await c.req.text()
  const expected = `sha256=${hmacHex(scoring.source.secret, `${timestamp}.${raw}`)}`
  if (!timingSafeEqual(signatureHeader, expected)) {
    return respondBadSignature(c)
  }

  c.set('dynamicChallenge', challenge)
  await next()
}
