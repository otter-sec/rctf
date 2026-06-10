import { config } from '@rctf/config'
import { ADVISORY_LOCK_KEYS, createDatabase } from '@rctf/db'
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
  LEADER_POLL_INTERVAL_MS,
  LEADERBOARD_FORCE_UPDATE_CHANNEL,
  LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL,
  type DecayRecomputeRequest,
} from './index'
import { createLeaderElection } from './leader-election'
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

const election = createLeaderElection({
  sql: config.database.sql,
  lockKey: ADVISORY_LOCK_KEYS.leaderboardLeader,
  pollIntervalMs: LEADER_POLL_INTERVAL_MS,
  onAcquired: async () => {
    logger.info('acquired leaderboard leadership')

    queue.enqueue({ scope: 'all', source: 'decay-recompute' })
    await queue.flush()

    while (election.isLeader() && queue.hasPending()) {
      await Bun.sleep(1_000)
      await queue.flush()
    }
  },
  onLost: () => {
    logger.warn('lost leaderboard leadership')
  },
  logger,
})

const gatedTick = (opts?: { forceCache?: boolean }): Promise<void> | void => {
  if (!election.isLeader()) {
    return
  }
  return tick(opts)
}

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
  shouldFlush: () => election.isLeader(),
  onFlushed: () => gatedTick({ forceCache: true }),
  logger,
})

const gatedSchedule = (request: DecayRecomputeRequest): void => {
  if (!election.isLeader()) {
    return
  }
  queue.schedule(request)
}

const subscriber = await createRedis({ lua: false })
await subscriber.subscribe(
  LEADERBOARD_FORCE_UPDATE_CHANNEL,
  LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL
)

subscriber.on('message', (channel, message) => {
  switch (channel) {
    case LEADERBOARD_FORCE_UPDATE_CHANNEL:
      return gatedTick({ forceCache: true })
    case LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL:
      return gatedSchedule(JSON.parse(message))
  }
})

setInterval(gatedTick, config.leaderboard.updateInterval)

// @ts-ignore TS2322
onmessage = (ev: any) => {
  if (ev?.data?.type === 'shutdown') {
    void election.stop().finally(() => {
      try {
        postMessage({ type: 'shutdown-complete' })
      } catch {}
    })
    return
  }
  if (ev?.data?.type === 'force-update') {
    gatedTick({ forceCache: true })
    return
  }
  if (ev?.data?.type === 'recompute-decay') {
    queue.schedule(ev.data as DecayRecomputeRequest)
  }
}

election.start()
