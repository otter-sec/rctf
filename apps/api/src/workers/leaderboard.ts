import { config } from '@rctf/config'
import { createDatabase } from '@rctf/db'
import { pino } from 'pino'
import { cacheLeaderboardAndGraph } from '../cache/leaderboard'
import { createCachedLeaderboardCalculator } from '../services/leaderboard'
import { createRedis } from '../util/redis'

const logger = pino().child({ module: 'leaderboard-worker' })
const { db } = createDatabase(config.database.sql)
const redis = await createRedis()
let calculateCachedLeaderboard = createCachedLeaderboardCalculator()

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
      calculateCachedLeaderboard = createCachedLeaderboardCalculator()
      consecutiveFailures = 0
    }
  } finally {
    running = false
  }
}

tick()
setInterval(tick, config.leaderboard.updateInterval)

// @ts-ignore TS2322
onmessage = (ev: any) => {
  if (ev?.data?.type === 'force-update') {
    tick()
  }
}
