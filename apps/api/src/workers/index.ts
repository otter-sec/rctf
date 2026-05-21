import pino from 'pino'
import type { TypedRedis } from '../cache/scripts'

const workerExt = process.env.WORKER_EXTENSION ?? '.ts'
const logger = pino().child({ module: 'workers' })

export const LEADERBOARD_FORCE_UPDATE_CHANNEL = 'leaderboard:force-update'
export const LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL =
  'leaderboard:recompute-challenge'

let leaderboardWorker: Worker | undefined
let dynamicScoresWorker: Worker | undefined

const startWorker = (logger: pino.Logger, fileName: string, name: string) => {
  const workerUrl = new URL(fileName, import.meta.url).href

  const w = new Worker(workerUrl, { type: 'module', name })
  w.addEventListener('error', event => {
    logger.error({ workerUrl, error: event.message }, `${name} worker error`)
  })

  logger.info({ workerUrl }, `started ${name} worker`)
  return w
}

export const startLeaderboardWorker = (logger: pino.Logger) => {
  leaderboardWorker = startWorker(
    logger,
    `./leaderboard${workerExt}`,
    'leaderboard-worker'
  )
}

export const startDynamicScoresWorker = (logger: pino.Logger) => {
  dynamicScoresWorker = startWorker(
    logger,
    `./dynamic-scores${workerExt}`,
    'dynamic-scores-worker'
  )
}

export const forceLeaderboardUpdate = (redis?: TypedRedis): void => {
  try {
    leaderboardWorker?.postMessage({ type: 'force-update' })
  } catch (err) {
    logger.error({ err }, 'failed to post leaderboard force-update message')
  }

  if (redis) {
    redis.publish(LEADERBOARD_FORCE_UPDATE_CHANNEL, '1').catch(err => {
      logger.error({ err }, 'failed to publish leaderboard force-update')
    })
  }
}

export const requestChallengeRecompute = (
  redis: TypedRedis | undefined,
  challengeId: string
): void => {
  try {
    leaderboardWorker?.postMessage({
      type: 'recompute-challenge',
      challengeId,
    })
  } catch (err) {
    logger.error(
      { err, challengeId },
      'failed to post challenge-recompute message'
    )
  }

  if (redis) {
    redis
      .publish(LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL, challengeId)
      .catch(err => {
        logger.error(
          { err, challengeId },
          'failed to publish challenge-recompute'
        )
      })
  }
}

export const stopWorkers = (): void => {
  try {
    leaderboardWorker?.terminate()
  } catch {}
  try {
    dynamicScoresWorker?.terminate()
  } catch {}
}
