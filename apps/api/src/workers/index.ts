import pino from 'pino'
import type { TypedRedis } from '../cache/scripts'

const workerExt = process.env.WORKER_EXTENSION ?? '.ts'
const logger = pino().child({ module: 'workers' })

export const LEADERBOARD_FORCE_UPDATE_CHANNEL = 'leaderboard:force-update'
export const LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL =
  'leaderboard:recompute-challenge'

const RESTART_BACKOFF_BASE_MS = 500
const RESTART_BACKOFF_MAX_MS = 30_000
const RESTART_BACKOFF_RESET_MS = 30_000

type Supervised = {
  get worker(): Worker | undefined
  stop(): void
}

const supervise = (
  log: pino.Logger,
  fileName: string,
  name: string
): Supervised => {
  const workerUrl = new URL(fileName, import.meta.url).href
  let current: Worker | undefined
  let stopped = false
  let attempts = 0
  let stableTimer: ReturnType<typeof setTimeout> | undefined

  const spawn = (): void => {
    if (stopped) {
      return
    }

    const w = new Worker(workerUrl, { type: 'module', name })
    let closeHandled = false

    if (stableTimer) {
      clearTimeout(stableTimer)
    }
    stableTimer = setTimeout(() => {
      attempts = 0
      stableTimer = undefined
    }, RESTART_BACKOFF_RESET_MS)

    const scheduleRestart = (cause: string, detail: unknown): void => {
      if (closeHandled || stopped) {
        return
      }
      closeHandled = true
      if (stableTimer) {
        clearTimeout(stableTimer)
        stableTimer = undefined
      }
      const delay = Math.min(
        RESTART_BACKOFF_MAX_MS,
        RESTART_BACKOFF_BASE_MS * Math.pow(2, attempts)
      )
      attempts++
      log.warn(
        { workerUrl, name, cause, detail, delay, attempts },
        `${name} worker stopped; respawning`
      )
      setTimeout(spawn, delay)
    }

    w.addEventListener('error', event => {
      log.error({ workerUrl, error: event.message }, `${name} worker error`)
      try {
        w.terminate()
      } catch {}
      scheduleRestart('error', event.message)
    })

    w.addEventListener('close', () => {
      scheduleRestart('close', null)
    })

    current = w
    log.info({ workerUrl }, `started ${name} worker`)
  }

  spawn()

  return {
    get worker() {
      return current
    },
    stop() {
      stopped = true
      if (stableTimer) {
        clearTimeout(stableTimer)
        stableTimer = undefined
      }
      try {
        current?.terminate()
      } catch {}
    },
  }
}

let leaderboardSupervisor: Supervised | undefined
let dynamicScoresSupervisor: Supervised | undefined

export const startLeaderboardWorker = (log: pino.Logger) => {
  leaderboardSupervisor = supervise(
    log,
    `./leaderboard${workerExt}`,
    'leaderboard-worker'
  )
}

export const startDynamicScoresWorker = (log: pino.Logger) => {
  dynamicScoresSupervisor = supervise(
    log,
    `./dynamic-scores${workerExt}`,
    'dynamic-scores-worker'
  )
}

export const forceLeaderboardUpdate = (redis?: TypedRedis): void => {
  try {
    leaderboardSupervisor?.worker?.postMessage({ type: 'force-update' })
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
    leaderboardSupervisor?.worker?.postMessage({
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
  leaderboardSupervisor?.stop()
  dynamicScoresSupervisor?.stop()
}
