import { afterEach, describe, expect, mock, test } from 'bun:test'
import { scoreProvider } from '../../../../apps/api/src/providers'
import { createRecomputeQueue } from '../../../../apps/api/src/workers/leaderboard-recompute'

const setRequiredFields = (fields: ReadonlyArray<string>) => {
  const previous = scoreProvider.requiredFields
  Object.assign(scoreProvider, { requiredFields: fields })
  return () => Object.assign(scoreProvider, { requiredFields: previous })
}

const restorers: Array<() => void> = []
afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()!()
  }
})

const requireMaxSolves = () => {
  restorers.push(setRequiredFields(['maxSolves']))
}
const requireNothing = () => {
  restorers.push(setRequiredFields([]))
}

const makeQueue = (
  opts: { initialMaxSolves?: number; maxSolves?: number } = {}
) => {
  let currentMaxSolves = opts.maxSolves
  const getMaxSolves =
    currentMaxSolves === undefined
      ? undefined
      : mock(async () => currentMaxSolves!)
  const applyForChallenge = mock(
    async (_id: string, _src: string, _maxSolves?: number) => {}
  )
  const applyForAll = mock(async (_src: string) => {})
  const onFlushed = mock(async () => {})
  const logger = { error: mock(() => {}) }
  const queue = createRecomputeQueue({
    debounceMs: 0,
    applyForChallenge,
    applyForAll,
    getMaxSolves,
    initialMaxSolves: opts.initialMaxSolves,
    onFlushed,
    logger,
  })
  const setMaxSolves = (value: number) => {
    currentMaxSolves = value
  }
  return {
    queue,
    applyForChallenge,
    applyForAll,
    getMaxSolves,
    setMaxSolves,
    onFlushed,
    logger,
  }
}

const createDeferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(res => {
    resolve = res
  })
  return { promise, resolve }
}

const waitUntil = async (
  predicate: () => boolean,
  timeoutMs = 100
): Promise<boolean> => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 1))
  }
  return predicate()
}

describe('recompute queue enqueue/flush', () => {
  test('explicit all-scope dispatches applyForAll', async () => {
    requireNothing()
    const { queue, applyForAll, applyForChallenge, onFlushed } = makeQueue()

    queue.enqueue({ scope: 'all', source: 'algo-change' })
    await queue.flush()

    expect(applyForAll).toHaveBeenCalledWith('algo-change')
    expect(applyForChallenge).not.toHaveBeenCalled()
    expect(onFlushed).toHaveBeenCalledTimes(1)
  })

  test('challenge-scope algo-change stays per-challenge under maxSolves', async () => {
    requireMaxSolves()
    const { queue, applyForChallenge, applyForAll } = makeQueue()

    queue.enqueue({
      scope: 'challenge',
      challengeId: 'c1',
      source: 'algo-change',
    })
    await queue.flush()

    expect(applyForChallenge).toHaveBeenCalledWith(
      'c1',
      'algo-change',
      undefined
    )
    expect(applyForAll).not.toHaveBeenCalled()
  })

  test('challenge-scope flag promotes to all-scope when maxSolves changes', async () => {
    requireMaxSolves()
    const { queue, applyForAll, applyForChallenge, getMaxSolves } = makeQueue({
      initialMaxSolves: 1,
      maxSolves: 2,
    })

    queue.enqueue({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    await queue.flush()

    expect(getMaxSolves).toHaveBeenCalled()
    expect(applyForAll).toHaveBeenCalledWith('flag')
    expect(applyForChallenge).not.toHaveBeenCalled()
  })

  test('challenge-scope flag stays per-challenge under maxSolves when maxSolves is unchanged', async () => {
    requireMaxSolves()
    const { queue, applyForChallenge, applyForAll, getMaxSolves } = makeQueue({
      initialMaxSolves: 2,
      maxSolves: 2,
    })

    queue.enqueue({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    await queue.flush()

    expect(getMaxSolves).toHaveBeenCalled()
    expect(applyForChallenge).toHaveBeenCalledWith('c1', 'flag', 2)
    expect(applyForAll).not.toHaveBeenCalled()
  })

  test('challenge-scope flag stays per-challenge when not maxSolves', async () => {
    requireNothing()
    const { queue, applyForChallenge, applyForAll } = makeQueue()

    queue.enqueue({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    await queue.flush()

    expect(applyForChallenge).toHaveBeenCalledWith('c1', 'flag', undefined)
    expect(applyForAll).not.toHaveBeenCalled()
  })

  test('flush is a no-op when nothing is queued', async () => {
    requireNothing()
    const { queue, applyForChallenge, applyForAll, onFlushed } = makeQueue()

    await queue.flush()

    expect(applyForChallenge).not.toHaveBeenCalled()
    expect(applyForAll).not.toHaveBeenCalled()
    expect(onFlushed).not.toHaveBeenCalled()
  })

  test('first-wins for repeated challenge enqueues of the same challenge', async () => {
    requireNothing()
    const { queue, applyForChallenge } = makeQueue()

    queue.enqueue({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    queue.enqueue({ scope: 'challenge', challengeId: 'c1', source: 'delete' })
    await queue.flush()

    expect(applyForChallenge).toHaveBeenCalledTimes(1)
    expect(applyForChallenge).toHaveBeenCalledWith('c1', 'flag', undefined)
  })

  test('maxSolves change supersedes pending challenge-scope under maxSolves', async () => {
    requireMaxSolves()
    const { queue, applyForAll, applyForChallenge } = makeQueue({
      initialMaxSolves: 1,
      maxSolves: 2,
    })

    // 'algo-change' enqueues into per-challenge bucket
    queue.enqueue({
      scope: 'challenge',
      challengeId: 'c1',
      source: 'algo-change',
    })
    // 'flag' promotes to all-scope only because maxSolves changed
    queue.enqueue({ scope: 'challenge', challengeId: 'c2', source: 'flag' })
    await queue.flush()

    expect(applyForAll).toHaveBeenCalledTimes(1)
    expect(applyForAll).toHaveBeenCalledWith('flag')
    expect(applyForChallenge).not.toHaveBeenCalled()
  })

  test('multiple challenge-scope enqueues fan out via applyForChallenge', async () => {
    requireNothing()
    const { queue, applyForChallenge, applyForAll } = makeQueue()

    queue.enqueue({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    queue.enqueue({ scope: 'challenge', challengeId: 'c2', source: 'delete' })
    await queue.flush()

    expect(applyForAll).not.toHaveBeenCalled()
    expect(applyForChallenge).toHaveBeenCalledTimes(2)
    const callArgs = applyForChallenge.mock.calls.map(c => [c[0], c[1]])
    expect(callArgs).toContainEqual(['c1', 'flag'])
    expect(callArgs).toContainEqual(['c2', 'delete'])
  })

  test('schedule debounces enqueues until the timer fires', async () => {
    requireNothing()
    const { queue, applyForChallenge, onFlushed } = makeQueue()

    queue.schedule({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    queue.schedule({ scope: 'challenge', challengeId: 'c2', source: 'flag' })
    expect(applyForChallenge).not.toHaveBeenCalled()

    // debounceMs=0 still defers to the next macrotask
    await new Promise(resolve => setTimeout(resolve, 5))

    expect(applyForChallenge).toHaveBeenCalledTimes(2)
    expect(onFlushed).toHaveBeenCalledTimes(1)
  })

  test('schedule during an active flush does not start a concurrent flush', async () => {
    requireNothing()
    const firstStarted = createDeferred()
    const releaseFirst = createDeferred()
    const calls: string[] = []
    let active = 0
    let maxActive = 0
    const applyForChallenge = mock(async (id: string) => {
      calls.push(id)
      active++
      maxActive = Math.max(maxActive, active)
      try {
        if (id === 'c1') {
          firstStarted.resolve()
          await releaseFirst.promise
        }
      } finally {
        active--
      }
    })
    const q = createRecomputeQueue({
      debounceMs: 0,
      applyForChallenge,
      applyForAll: mock(async () => {}),
      onFlushed: mock(async () => {}),
      logger: { error: mock(() => {}) },
    })

    q.schedule({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    await firstStarted.promise

    q.schedule({ scope: 'challenge', challengeId: 'c2', source: 'flag' })
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(calls).toEqual(['c1'])
    expect(maxActive).toBe(1)

    releaseFirst.resolve()
    expect(await waitUntil(() => calls.length === 2)).toBe(true)
    expect(calls).toEqual(['c1', 'c2'])
    expect(maxActive).toBe(1)
  })

  test('applyForAll errors are logged but do not throw', async () => {
    requireNothing()
    const { queue, logger, onFlushed } = makeQueue()
    const applyForAll = mock(async () => {
      throw new Error('boom')
    })
    const failing = createRecomputeQueue({
      debounceMs: 0,
      applyForChallenge: mock(async () => {}),
      applyForAll,
      onFlushed,
      logger,
    })

    failing.enqueue({ scope: 'all', source: 'algo-change' })
    await failing.flush()

    expect(applyForAll).toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalled()
    expect(onFlushed).toHaveBeenCalledTimes(1)
    // unused
    void queue
  })

  test('shouldFlush=false parks pending work until a later flush', async () => {
    requireNothing()
    const onFlushed = mock(async () => {})
    const logger = { error: mock(() => {}) }
    const applyForChallenge = mock(
      async (_id: string, _src: string, _maxSolves?: number) => {}
    )
    let gateOpen = false
    const q = createRecomputeQueue({
      debounceMs: 0,
      applyForChallenge,
      applyForAll: mock(async () => {}),
      shouldFlush: () => gateOpen,
      onFlushed,
      logger,
    })

    q.enqueue({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    await q.flush()

    expect(applyForChallenge).not.toHaveBeenCalled()
    expect(onFlushed).not.toHaveBeenCalled()

    gateOpen = true
    await q.flush()

    expect(applyForChallenge).toHaveBeenCalledWith('c1', 'flag', undefined)
    expect(onFlushed).toHaveBeenCalledTimes(1)
  })

  test('scheduled shouldFlush=false parks pending work without a retry loop', async () => {
    requireNothing()
    const logger = { error: mock(() => {}) }
    const applyForChallenge = mock(async () => {})
    let shouldFlushCalls = 0
    const q = createRecomputeQueue({
      debounceMs: 0,
      applyForChallenge,
      applyForAll: mock(async () => {}),
      shouldFlush: () => {
        shouldFlushCalls++
        return false
      },
      onFlushed: mock(async () => {}),
      logger,
    })

    q.schedule({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    expect(await waitUntil(() => shouldFlushCalls > 0)).toBe(true)

    const callsAfterFirstTimer = shouldFlushCalls
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(shouldFlushCalls).toBe(callsAfterFirstTimer)
    expect(applyForChallenge).not.toHaveBeenCalled()
    expect(q.hasPending()).toBe(true)
  })

  test('hasPending tracks queued and re-parked work', async () => {
    requireNothing()
    const logger = { error: mock(() => {}) }
    let failures = 1
    const applyForAll = mock(async () => {
      if (failures > 0) {
        failures--
        throw new Error('boom')
      }
    })
    const q = createRecomputeQueue({
      debounceMs: 0,
      applyForChallenge: mock(async () => {}),
      applyForAll,
      onFlushed: mock(async () => {}),
      logger,
    })

    expect(q.hasPending()).toBe(false)
    q.enqueue({ scope: 'all', source: 'algo-change' })
    expect(q.hasPending()).toBe(true)

    // a failed flush re-parks the all-scope entry
    await q.flush()
    expect(q.hasPending()).toBe(true)

    await q.flush()
    expect(q.hasPending()).toBe(false)
  })

  test('requeues a failed per-challenge recompute instead of dropping it', async () => {
    requireNothing()
    const onFlushed = mock(async () => {})
    const logger = { error: mock(() => {}) }
    let attempts = 0
    const applyForChallenge = mock(async () => {
      attempts++
      if (attempts === 1) {
        throw new Error('boom')
      }
    })
    const q = createRecomputeQueue({
      debounceMs: 0,
      applyForChallenge,
      applyForAll: mock(async () => {}),
      onFlushed,
      logger,
    })

    q.enqueue({ scope: 'challenge', challengeId: 'c1', source: 'flag' })
    await q.flush()
    expect(applyForChallenge).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalled()

    await q.flush()
    expect(applyForChallenge).toHaveBeenCalledTimes(2)
    expect(applyForChallenge.mock.calls[1]?.[0]).toBe('c1')
  })
})
