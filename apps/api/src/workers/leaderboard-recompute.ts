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
  onFlushed: () => Promise<void> | void
  logger: Logger
}

export const createRecomputeQueue = (opts: RecomputeQueueOptions) => {
  const pendingChallengeRecomputes = new Map<string, RecomputeSource>()
  let pendingAllSource: RecomputeSource | undefined
  let pendingMaxSolvesSource: RecomputeSource | undefined
  let knownMaxSolves = opts.initialMaxSolves
  let recomputeTimer: ReturnType<typeof setTimeout> | undefined

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

  const runAllScope = (source: RecomputeSource): Promise<unknown> =>
    opts
      .applyForAll(source)
      .catch(err =>
        opts.logger.error({ err }, 'all challenge recompute failed')
      )

  const runPerChallenge = (
    recomputes: ReadonlyMap<string, RecomputeSource>,
    maxSolves: number | undefined
  ): Promise<unknown[]> =>
    Promise.all(
      Array.from(recomputes, ([challengeId, source]) =>
        opts
          .applyForChallenge(challengeId, source, maxSolves)
          .catch(err =>
            opts.logger.error(
              { err, challengeId },
              'challenge recompute failed'
            )
          )
      )
    )

  const flush = async (): Promise<void> => {
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
      await runAllScope(allSource)
      // if we entered all-scope without sampling above, refresh now
      if (currentMaxSolves === undefined) {
        await readMaxSolves()
      }
    } else {
      await runPerChallenge(challengeRecomputes, currentMaxSolves)
    }

    await opts.onFlushed()
  }

  const schedule = (request: DecayRecomputeRequest): void => {
    enqueue(request)
    if (recomputeTimer) {
      return
    }
    recomputeTimer = setTimeout(() => {
      recomputeTimer = undefined
      flush().catch(err => opts.logger.error({ err }, 'flushRecomputes failed'))
    }, opts.debounceMs)
  }

  return { schedule, enqueue, flush }
}
