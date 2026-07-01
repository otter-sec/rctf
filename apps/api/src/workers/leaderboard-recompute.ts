import {
  recomputeSourceCanChangeMaxSolves,
  type RecomputeSource,
} from '../services/solve-points'
import type { DecayRecomputeRequest } from './index'

type Logger = { error: (obj: unknown, msg?: string) => void }

type RecomputeQueueOptions = {
  debounceMs: number
  applyForChallenge: (
    challengeId: string,
    source: RecomputeSource,
    maxSolves?: number
  ) => Promise<unknown>
  applyForAll: (source: RecomputeSource) => Promise<unknown>
  getMaxSolves?: () => Promise<number>
  initialMaxSolves?: number
  shouldFlush?: () => boolean
  onFlushed: () => Promise<void> | void
  logger: Logger
}

export const createRecomputeQueue = (opts: RecomputeQueueOptions) => {
  const pendingChallengeRecomputes = new Map<string, RecomputeSource>()
  let pendingAllSource: RecomputeSource | undefined
  let pendingMaxSolvesSource: RecomputeSource | undefined
  let knownMaxSolves = opts.initialMaxSolves
  let recomputeTimer: ReturnType<typeof setTimeout> | undefined
  let runningFlush: Promise<void> | undefined

  const hasPending = (): boolean =>
    pendingChallengeRecomputes.size > 0 || pendingAllSource !== undefined

  const scheduleRetry = (): void => {
    if (recomputeTimer || runningFlush) {
      return
    }
    recomputeTimer = setTimeout(() => {
      recomputeTimer = undefined
      flush().catch(err => opts.logger.error({ err }, 'flushRecomputes failed'))
    }, opts.debounceMs)
  }

  const enqueue = (request: DecayRecomputeRequest): void => {
    const source = request.source ?? 'decay-recompute'
    if (request.scope === 'all') {
      pendingAllSource ??= source
      return
    }
    if (!pendingChallengeRecomputes.has(request.challengeId)) {
      pendingChallengeRecomputes.set(request.challengeId, source)
    }
    if (recomputeSourceCanChangeMaxSolves(source)) {
      pendingMaxSolvesSource ??= source
    }
  }

  // refresh and cache the current maxSolves
  const readMaxSolves = async (): Promise<number | undefined> => {
    if (!opts.getMaxSolves) {
      return undefined
    }
    try {
      knownMaxSolves = await opts.getMaxSolves()
      return knownMaxSolves
    } catch (err) {
      opts.logger.error({ err }, 'failed to read max solve count')
      return undefined
    }
  }

  const runAllScope = (source: RecomputeSource): Promise<boolean> =>
    opts
      .applyForAll(source)
      .then(() => true)
      .catch(err => {
        opts.logger.error({ err }, 'all challenge recompute failed')
        return false
      })

  const runPerChallenge = async (
    recomputes: ReadonlyMap<string, RecomputeSource>,
    maxSolves: number | undefined
  ): Promise<Array<[string, RecomputeSource]>> => {
    const failed: Array<[string, RecomputeSource]> = []
    for (const [challengeId, source] of recomputes) {
      try {
        await opts.applyForChallenge(challengeId, source, maxSolves)
      } catch (err) {
        opts.logger.error({ err, challengeId }, 'challenge recompute failed')
        failed.push([challengeId, source])
      }
    }
    return failed
  }

  const requeueChallenge = (
    challengeId: string,
    source: RecomputeSource
  ): void => {
    if (!pendingChallengeRecomputes.has(challengeId)) {
      pendingChallengeRecomputes.set(challengeId, source)
    }
    if (recomputeSourceCanChangeMaxSolves(source)) {
      pendingMaxSolvesSource ??= source
    }
  }

  const flushOnce = async (): Promise<void> => {
    const challengeRecomputes = new Map(pendingChallengeRecomputes)
    let allSource = pendingAllSource
    const maxSolvesSource = pendingMaxSolvesSource
    pendingChallengeRecomputes.clear()
    pendingAllSource = undefined
    pendingMaxSolvesSource = undefined

    if (!allSource && challengeRecomputes.size === 0) {
      return
    }

    // if a pending per-challenge recompute could shift maxSolves, sample now
    let currentMaxSolves: number | undefined
    if (!allSource && maxSolvesSource && opts.getMaxSolves) {
      const previous = knownMaxSolves
      currentMaxSolves = await readMaxSolves()
      if (currentMaxSolves === undefined || currentMaxSolves !== previous) {
        allSource = maxSolvesSource
      }
    }

    if (allSource) {
      const ok = await runAllScope(allSource)
      // if we entered all-scope without sampling above, refresh now
      if (currentMaxSolves === undefined) {
        await readMaxSolves()
      }
      if (!ok) {
        pendingAllSource ??= allSource
      }
    } else {
      const failed = await runPerChallenge(
        challengeRecomputes,
        currentMaxSolves
      )
      for (const [challengeId, source] of failed) {
        requeueChallenge(challengeId, source)
      }
    }

    await opts.onFlushed()
  }

  const flush = (): Promise<void> => {
    if (runningFlush) {
      return runningFlush
    }
    if (opts.shouldFlush && !opts.shouldFlush()) {
      return Promise.resolve()
    }

    const run = flushOnce()
    runningFlush = run.finally(() => {
      runningFlush = undefined
      if (hasPending()) {
        scheduleRetry()
      }
    })
    return runningFlush
  }

  const schedule = (request: DecayRecomputeRequest): void => {
    enqueue(request)
    scheduleRetry()
  }

  return { schedule, enqueue, flush, hasPending }
}
