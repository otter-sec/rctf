import { config } from '@rctf/config'
import { createDatabase } from '@rctf/db'
import { pino } from 'pino'
import { cacheLeaderboardAndGraph } from '../cache/leaderboard'
import { createCachedLeaderboardCalculator } from '../services/leaderboard'
import { applyDecayPointsForChallenge } from '../services/solve-points'
import { createRedis } from '../util/redis'
import {
  LEADERBOARD_FORCE_UPDATE_CHANNEL,
  LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL,
} from './index'
import { createLeaderboardTickRunner } from './leaderboard-runner'

const logger = pino().child({ module: 'leaderboard-worker' })
const { db } = createDatabase(config.database.sql)
const redis = await createRedis()
const tickRunner = createLeaderboardTickRunner({
  db,
  redis,
  createCalculator: () => createCachedLeaderboardCalculator(redis),
  cacheLeaderboardAndGraph,
  logger,
})
const tick = tickRunner.tick

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
      await applyDecayPointsForChallenge(db, challengeId)
    } catch (err) {
      logger.error({ err, challengeId }, 'challenge recompute failed')
    }
  }
  if (ids.length > 0) {
    await tick({ forceCache: true })
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

const subscriber = await createRedis({ lua: false })
await subscriber.subscribe(
  LEADERBOARD_FORCE_UPDATE_CHANNEL,
  LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL
)

subscriber.on('message', (channel, message) => {
  switch (channel) {
    case LEADERBOARD_FORCE_UPDATE_CHANNEL:
      return tick({ forceCache: true })
    case LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL:
      return scheduleRecompute(message)
  }
})

tick({ forceCache: true })
setInterval(tick, config.leaderboard.updateInterval)

// @ts-ignore TS2322
onmessage = (ev: any) => {
  if (ev?.data?.type === 'force-update') {
    tick({ forceCache: true })
    return
  }
  if (ev?.data?.type === 'recompute-challenge') {
    scheduleRecompute(ev.data.challengeId)
  }
}
