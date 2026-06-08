import { createSingleConnectionClient, type SqlConfig } from '@rctf/db'

type Logger = {
  info: (obj: unknown, msg?: string) => void
  warn: (obj: unknown, msg?: string) => void
  error: (obj: unknown, msg?: string) => void
}

export type LeaderElectionOptions = {
  sql: SqlConfig
  lockKey: number
  pollIntervalMs: number
  onAcquired?: () => void | Promise<void>
  onLost?: () => void | Promise<void>
  logger: Logger
}

export type LeaderElection = {
  isLeader: () => boolean
  start: () => void
  stop: () => Promise<void>
}

export const createLeaderElection = (
  opts: LeaderElectionOptions
): LeaderElection => {
  const lockSql = createSingleConnectionClient(opts.sql)
  let leader = false
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let leaderPid: number | null = null

  const setLeader = (next: boolean): void => {
    if (next === leader) {
      return
    }

    leader = next
    const hook = next ? opts.onAcquired : opts.onLost
    if (hook) {
      Promise.resolve()
        .then(hook)
        .catch(err => opts.logger.error({ err }, 'leader election hook failed'))
    }
  }

  const schedule = (): void => {
    if (stopped) {
      return
    }
    timer = setTimeout(() => void poll(), opts.pollIntervalMs)
    timer.unref?.()
  }

  const poll = async (): Promise<void> => {
    if (stopped) {
      return
    }

    try {
      if (leader) {
        // a changed pid means postgres-js silently reconnected and the lock was released
        const [row] = await lockSql<{ pid: number }[]>`
          SELECT pg_backend_pid() AS pid
        `

        if (!row || row.pid !== leaderPid) {
          leaderPid = null
          setLeader(false)
        }
      }

      if (!leader) {
        const [row] = await lockSql<{ locked: boolean; pid: number }[]>`
          SELECT pg_try_advisory_lock(${opts.lockKey}::bigint) AS locked,
                 pg_backend_pid() AS pid
        `

        if (row?.locked) {
          leaderPid = row.pid
          setLeader(true)
        }
      }
    } catch (err) {
      // assume the lock is no longer held
      leaderPid = null
      setLeader(false)
      opts.logger.error({ err }, 'leader election poll failed')
    } finally {
      schedule()
    }
  }

  return {
    isLeader: () => leader,

    start: () => {
      if (stopped) {
        return
      }
      void poll()
    },

    stop: async () => {
      stopped = true
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }

      try {
        if (leader) {
          await lockSql`SELECT pg_advisory_unlock(${opts.lockKey}::bigint)`
        }
      } catch (err) {
        opts.logger.error({ err }, 'failed to release leader lock')
      } finally {
        leader = false
        leaderPid = null
        await lockSql.end({ timeout: 5 }).catch(() => {})
      }
    },
  }
}
