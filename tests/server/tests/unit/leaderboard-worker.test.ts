import { describe, expect, mock, test } from 'bun:test'
import type { CalculatedLeaderboard } from '../../../../apps/api/src/cache/leaderboard'
import { createLeaderboardTickRunner } from '../../../../apps/api/src/workers/leaderboard-runner'

const createDeferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const leaderboardWithScore = (score: number): CalculatedLeaderboard => ({
  users: [
    {
      id: 'user1',
      name: 'User One',
      division: 'open',
      score,
      hadAnySolve: true,
      lastSolve: 1,
      lastTiebreakEligibleSolve: 1,
    },
  ],
  challengeInfos: new Map(),
  samples: [],
})

describe('leaderboard worker tick runner', () => {
  test('queues an overlapping forced tick and writes even when calculator reports unchanged', async () => {
    const first = createDeferred<void>()
    const calculations = [
      { wait: first.promise, score: 112 },
      { wait: Promise.resolve(), score: 178 },
    ]

    const calculate = mock(async () => {
      const next = calculations.shift()
      if (!next) {
        throw new Error('unexpected calculation')
      }
      await next.wait
      return {
        calculated: leaderboardWithScore(next.score),
        changed: false,
        recomputedFromScratch: false,
      }
    })
    const createCalculator = mock(() => calculate)
    const cacheLeaderboardAndGraph = mock(async () => {})
    const logger = {
      error: mock(() => {}),
      warn: mock(() => {}),
    }
    const runner = createLeaderboardTickRunner({
      db: {} as any,
      redis: {} as any,
      createCalculator,
      cacheLeaderboardAndGraph,
      logger,
      now: () => 0,
    })

    const runningTick = runner.tick()
    await Promise.resolve()
    await runner.tick({ forceCache: true })

    expect(cacheLeaderboardAndGraph).not.toHaveBeenCalled()

    first.resolve()
    await runningTick

    expect(calculate).toHaveBeenCalledTimes(2)
    expect(cacheLeaderboardAndGraph).toHaveBeenCalledTimes(1)
    expect(cacheLeaderboardAndGraph.mock.calls[0]?.[2]).toEqual(
      leaderboardWithScore(178)
    )
  })
})
