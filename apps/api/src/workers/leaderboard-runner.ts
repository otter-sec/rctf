import type { DatabaseClient } from '@rctf/db'
import type { CalculatedLeaderboard } from '../cache/leaderboard'
import type { TypedRedis } from '../cache/scripts'
import type { CachedLeaderboardComputation } from '../services/leaderboard'

type Calculator = (db: DatabaseClient) => Promise<CachedLeaderboardComputation>

type Logger = {
  error: (obj: unknown, msg?: string) => void
  warn: (msg: string) => void
}

type LeaderboardTickRunnerOptions = {
  db: DatabaseClient
  redis: TypedRedis
  createCalculator: () => Calculator
  cacheLeaderboardAndGraph: (
    db: DatabaseClient,
    redis: TypedRedis,
    data: CalculatedLeaderboard
  ) => Promise<void>
  logger: Logger
  now?: () => number
  periodicCacheIntervalMs?: number
}

type TickOptions = {
  forceCache?: boolean
}

export const createLeaderboardTickRunner = ({
  db,
  redis,
  createCalculator,
  cacheLeaderboardAndGraph,
  logger,
  now = Date.now,
  periodicCacheIntervalMs = 60_000,
}: LeaderboardTickRunnerOptions) => {
  let calculateCachedLeaderboard = createCalculator()
  let running = false
  let rerunRequested = false
  let forceCacheRequested = false
  let lastUpdatedAt = 0
  let consecutiveFailures = 0
  let pendingCacheWrite = false

  const runTick = async (forceCache: boolean): Promise<void> => {
    const currentTime = now()
    const result = await calculateCachedLeaderboard(db)
    const shouldCache =
      forceCache ||
      result.changed ||
      pendingCacheWrite ||
      currentTime - lastUpdatedAt > periodicCacheIntervalMs

    if (shouldCache) {
      pendingCacheWrite = true
      await cacheLeaderboardAndGraph(db, redis, result.calculated)
      pendingCacheWrite = false
      lastUpdatedAt = currentTime
    }
  }

  const tick = async (opts: TickOptions = {}): Promise<void> => {
    if (running) {
      rerunRequested = true
      forceCacheRequested = forceCacheRequested || opts.forceCache === true
      return
    }

    running = true
    let forceCache = opts.forceCache === true
    try {
      do {
        rerunRequested = false
        const shouldForceCache = forceCache || forceCacheRequested
        forceCache = false
        forceCacheRequested = false
        await runTick(shouldForceCache)
      } while (rerunRequested)

      consecutiveFailures = 0
    } catch (err) {
      consecutiveFailures++
      logger.error({ err }, 'leaderboard update failed')

      if (consecutiveFailures >= 3) {
        logger.warn('resetting leaderboard cache')
        calculateCachedLeaderboard = createCalculator()
        consecutiveFailures = 0
      }
    } finally {
      running = false
    }
  }

  return { tick }
}
