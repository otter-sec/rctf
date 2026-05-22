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

const startWorker = (log: pino.Logger, file: string, name: string) =>
  supervise(log, `./${file}${workerExt}`, name)

export const startLeaderboardWorker = (log: pino.Logger) => {
  leaderboardSupervisor = startWorker(log, 'leaderboard', 'leaderboard-worker')
}

export const startDynamicScoresWorker = (log: pino.Logger) => {
  dynamicScoresSupervisor = startWorker(
    log,
    'dynamic-scores',
    'dynamic-scores-worker'
  )
}

const notifyLeaderboard = (
  message: unknown,
  redis: TypedRedis | undefined,
  channel: string,
  payload: string
): void => {
  try {
    leaderboardSupervisor?.worker?.postMessage(message)
  } catch (err) {
    logger.error({ err, channel }, 'failed to post leaderboard worker message')
  }
  redis?.publish(channel, payload).catch(err => {
    logger.error({ err, channel }, 'failed to publish leaderboard message')
  })
}

export const forceLeaderboardUpdate = (redis?: TypedRedis): void =>
  notifyLeaderboard(
    { type: 'force-update' },
    redis,
    LEADERBOARD_FORCE_UPDATE_CHANNEL,
    '1'
  )

export const requestChallengeRecompute = (
  redis: TypedRedis | undefined,
  challengeId: string
): void =>
  notifyLeaderboard(
    { type: 'recompute-challenge', challengeId },
    redis,
    LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL,
    challengeId
  )

export const stopWorkers = (): void => {
  leaderboardSupervisor?.stop()
  dynamicScoresSupervisor?.stop()
}
