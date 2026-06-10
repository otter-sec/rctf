import pino from 'pino'
import type { TypedRedis } from '../cache/scripts'
import type { RecomputeSource } from '../services/solve-points'

const workerExt = process.env.WORKER_EXTENSION ?? '.ts'
const logger = pino().child({ module: 'workers' })

export const LEADERBOARD_FORCE_UPDATE_CHANNEL = 'leaderboard:force-update'
export const LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL =
  'leaderboard:recompute-challenge'

export const LEADER_LOCK_KEY = 8836914
export const LEADER_POLL_INTERVAL_MS = 5_000

const RESTART_BACKOFF_BASE_MS = 500
const RESTART_BACKOFF_MAX_MS = 30_000
const RESTART_BACKOFF_RESET_MS = 30_000
const SHUTDOWN_GRACE_MS = 1000

type Supervised = {
  get worker(): Worker | undefined
  stop(): Promise<void>
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
    async stop() {
      stopped = true
      if (stableTimer) {
        clearTimeout(stableTimer)
        stableTimer = undefined
      }

      const w = current
      if (!w) {
        return
      }

      try {
        w.postMessage({ type: 'shutdown' })
      } catch {}

      // wait for the worker to confirm it released its locks, capped by the
      // grace period so a hung worker can't stall shutdown
      await new Promise<void>(resolve => {
        const t = setTimeout(resolve, SHUTDOWN_GRACE_MS)
        t.unref?.()

        const settle = (): void => {
          clearTimeout(t)
          resolve()
        }

        w.addEventListener('message', event => {
          if (event.data?.type === 'shutdown-complete') {
            settle()
          }
        })
        w.addEventListener('close', settle)
      })

      try {
        w.terminate()
      } catch {}
    },
  }
}

let leaderboardSupervisor: Supervised | undefined

export const startLeaderboardWorker = (log: pino.Logger) => {
  leaderboardSupervisor = supervise(
    log,
    `./leaderboard${workerExt}`,
    'leaderboard-worker'
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

export type DecayRecomputeRequest =
  | { scope: 'all'; source?: RecomputeSource }
  | { scope: 'challenge'; challengeId: string; source?: RecomputeSource }

const publishRecompute = (
  redis: TypedRedis | undefined,
  request: DecayRecomputeRequest
): void =>
  notifyLeaderboard(
    { type: 'recompute-decay', ...request },
    redis,
    LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL,
    JSON.stringify(request)
  )

export const forceLeaderboardUpdate = (redis?: TypedRedis): void =>
  notifyLeaderboard(
    { type: 'force-update' },
    redis,
    LEADERBOARD_FORCE_UPDATE_CHANNEL,
    '1'
  )

export const requestChallengeRecompute = (
  redis: TypedRedis | undefined,
  challengeId: string,
  source: RecomputeSource = 'decay-recompute'
): void => publishRecompute(redis, { scope: 'challenge', challengeId, source })

export const requestAllChallengesRecompute = (
  redis: TypedRedis | undefined,
  source: RecomputeSource = 'decay-recompute'
): void => publishRecompute(redis, { scope: 'all', source })

export const stopWorkers = async (): Promise<void> => {
  await leaderboardSupervisor?.stop()
}
