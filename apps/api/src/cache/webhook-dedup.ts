import type { TypedRedis } from './scripts'

export const MAX_SKEW_MS = 5 * 60 * 1000
export const WEBHOOK_DEDUP_TTL_MS = 2 * MAX_SKEW_MS

const webhookDedupKey = (challengeId: string, signature: string) =>
  `webhook:dedup:${challengeId}:${signature}`

export const markWebhookSeen = async (
  redis: TypedRedis,
  challengeId: string,
  signature: string
): Promise<boolean> => {
  const result = await redis.set(
    webhookDedupKey(challengeId, signature),
    '1',
    'PX',
    WEBHOOK_DEDUP_TTL_MS,
    'NX'
  )
  return result === 'OK'
}

export const clearWebhookSeen = async (
  redis: TypedRedis,
  challengeId: string,
  signature: string
): Promise<void> => {
  await redis.del(webhookDedupKey(challengeId, signature))
}
