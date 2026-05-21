import { config } from '@rctf/config'
import { createDatabase } from '@rctf/db'
import { pino } from 'pino'
import { cacheLeaderboardAndGraph } from '../cache/leaderboard'
import { createCachedLeaderboardCalculator } from '../services/leaderboard'
import { recomputeChallengePoints } from '../services/solve-points'
import { createRedis } from '../util/redis'
import {
  LEADERBOARD_FORCE_UPDATE_CHANNEL,
  LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL,
} from './index'

const logger = pino().child({ module: 'leaderboard-worker' })
const { db } = createDatabase(config.database.sql)
const redis = await createRedis()
let calculateCachedLeaderboard = createCachedLeaderboardCalculator(redis)

const RECOMPUTE_DEBOUNCE_MS = Math.max(
  500,
  Math.min(config.leaderboard.updateInterval, 5000)
)
const pendingRecomputes = new Set<string>()
let recomputeTimer: ReturnType<typeof setTimeout> | undefined

const flushRecomputes = async (): Promise<void> => {
  const ids = Array.from(pendingRecomputes)
  pendingRecomputes.clear()
  for (const challengeId of ids) {
    try {
      await recomputeChallengePoints(db, challengeId, 'decay-recompute')
    } catch (err) {
      logger.error({ err, challengeId }, 'challenge recompute failed')
    }
  }
  if (ids.length > 0) {
    await tick()
  }
}

const scheduleRecompute = (challengeId: string): void => {
  pendingRecomputes.add(challengeId)
  if (recomputeTimer) {
    return
  }
  recomputeTimer = setTimeout(() => {
    recomputeTimer = undefined
    flushRecomputes().catch(err =>
      logger.error({ err }, 'flushRecomputes failed')
    )
  }, RECOMPUTE_DEBOUNCE_MS)
}

let running = false
let lastUpdatedAt = 0
let consecutiveFailures = 0
let pendingCacheWrite = false

const tick = async () => {
  if (running) {
    return
  }

  running = true
  try {
    const currentTime = Date.now()
    const result = await calculateCachedLeaderboard(db)

    let shouldCache = result.changed || pendingCacheWrite
    if (!shouldCache) {
      shouldCache = currentTime - lastUpdatedAt > 60_000
    }

    if (shouldCache) {
      pendingCacheWrite = true
      await cacheLeaderboardAndGraph(db, redis, result.calculated)
      pendingCacheWrite = false
      lastUpdatedAt = currentTime
    }

    consecutiveFailures = 0
  } catch (err) {
    consecutiveFailures++
    logger.error({ err }, 'leaderboard update failed')

    if (consecutiveFailures >= 3) {
      logger.warn('resetting leaderboard cache')
      calculateCachedLeaderboard = createCachedLeaderboardCalculator(redis)
      consecutiveFailures = 0
    }
  } finally {
    running = false
  }
}

const subscriber = await createRedis({ lua: false })
await subscriber.subscribe(
  LEADERBOARD_FORCE_UPDATE_CHANNEL,
  LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL
)

subscriber.on('message', (channel, message) => {
  switch (channel) {
    case LEADERBOARD_FORCE_UPDATE_CHANNEL:
      return tick()
    case LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL:
      return scheduleRecompute(message)
  }
})

tick()
setInterval(tick, config.leaderboard.updateInterval)

// @ts-ignore TS2322
onmessage = (ev: any) => {
  if (ev?.data?.type === 'force-update') {
    tick()
    return
  }
  if (ev?.data?.type === 'recompute-challenge') {
    scheduleRecompute(ev.data.challengeId)
  }
}
