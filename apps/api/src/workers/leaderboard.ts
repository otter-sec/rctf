import { config } from '@rctf/config'
import { createDatabase } from '@rctf/db'
import { pino } from 'pino'
import { cacheLeaderboardAndGraph } from '../cache/leaderboard'
import { getMaxSolveCount } from '../services/challenges'
import { createCachedLeaderboardCalculator } from '../services/leaderboard'
import {
  applyDecayPointsForAllChallenges,
  applyDecayPointsForChallenge,
  recomputeSourceCanChangeMaxSolves,
} from '../services/solve-points'
import { createRedis } from '../util/redis'
import {
  LEADERBOARD_FORCE_UPDATE_CHANNEL,
  LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL,
  type DecayRecomputeRequest,
} from './index'
import { createRecomputeQueue } from './leaderboard-recompute'
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

const shouldTrackMaxSolves = recomputeSourceCanChangeMaxSolves('flag')
const getTrackedMaxSolves = shouldTrackMaxSolves
  ? () => getMaxSolveCount(db)
  : undefined
const initialMaxSolves = getTrackedMaxSolves
  ? await getTrackedMaxSolves()
  : undefined

const queue = createRecomputeQueue({
  debounceMs: RECOMPUTE_DEBOUNCE_MS,
  applyForChallenge: (id, source, maxSolves) =>
    applyDecayPointsForChallenge(db, id, source, maxSolves),
  applyForAll: source => applyDecayPointsForAllChallenges(db, source),
  getMaxSolves: getTrackedMaxSolves,
  initialMaxSolves,
  onFlushed: () => tick({ forceCache: true }),
  logger,
})

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
      return queue.schedule(JSON.parse(message))
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
  if (ev?.data?.type === 'recompute-decay') {
    queue.schedule(ev.data as DecayRecomputeRequest)
  }
}
