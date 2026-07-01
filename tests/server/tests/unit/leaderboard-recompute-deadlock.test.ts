import { describe, expect, mock, test } from 'bun:test'
import { createRecomputeQueue } from '../../../../apps/api/src/workers/leaderboard-recompute'

type SimulatedTx = {
  id: string
  active: boolean
  heldRows: Set<string>
}

type LockWaiter = {
  tx: SimulatedTx
  resolve: () => void
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

const createDeadlockError = (
  tx: SimulatedTx,
  row: string,
  blockerId: string
): Error =>
  Object.assign(
    new Error(
      `deadlock detected while ${tx.id} waited for ${row} held by ${blockerId}`
    ),
    { code: '40P01' }
  )

const createUserRowLockSimulator = () => {
  const owners = new Map<string, SimulatedTx>()
  const waiters = new Map<string, LockWaiter[]>()
  const waitsFor = new Map<string, string>()

  const waitsForTransitively = (fromId: string, targetId: string): boolean => {
    const seen = new Set<string>()
    let current = waitsFor.get(fromId)
    while (current) {
      if (current === targetId) {
        return true
      }
      if (seen.has(current)) {
        return false
      }
      seen.add(current)
      current = waitsFor.get(current)
    }
    return false
  }

  const grantNextWaiter = (row: string): void => {
    const queue = waiters.get(row)
    while (queue && queue.length > 0) {
      const waiter = queue.shift()!
      if (!waiter.tx.active) {
        continue
      }

      owners.set(row, waiter.tx)
      waiter.tx.heldRows.add(row)
      waitsFor.delete(waiter.tx.id)
      waiter.resolve()
      return
    }
    waiters.delete(row)
  }

  const releaseAll = (tx: SimulatedTx): void => {
    tx.active = false
    waitsFor.delete(tx.id)

    for (const row of Array.from(tx.heldRows)) {
      if (owners.get(row) === tx) {
        owners.delete(row)
        grantNextWaiter(row)
      }
      tx.heldRows.delete(row)
    }
  }

  const begin = (id: string) => {
    const tx: SimulatedTx = {
      id,
      active: true,
      heldRows: new Set(),
    }

    return {
      async lock(row: string): Promise<void> {
        const owner = owners.get(row)
        if (!owner || owner === tx) {
          owners.set(row, tx)
          tx.heldRows.add(row)
          return
        }

        waitsFor.set(tx.id, owner.id)
        if (waitsForTransitively(owner.id, tx.id)) {
          waitsFor.delete(tx.id)
          throw createDeadlockError(tx, row, owner.id)
        }

        await new Promise<void>(resolve => {
          const queue = waiters.get(row) ?? []
          queue.push({ tx, resolve })
          waiters.set(row, queue)
        })
      },
      release: () => releaseAll(tx),
    }
  }

  return { begin }
}

const createOppositeOrderChallengeRecompute = () => {
  const locks = createUserRowLockSimulator()
  const solveOrders = new Map([
    ['challenge-a', ['user-1', 'user-2']],
    ['challenge-b', ['user-2', 'user-1']],
  ])

  const completed: string[] = []
  const deadlocks: Array<{ challengeId: string; error: unknown }> = []
  const lockEvents: Array<{ challengeId: string; userId: string }> = []

  const applyForChallenge = mock(async (challengeId: string) => {
    const solveOrder = solveOrders.get(challengeId)
    if (!solveOrder) {
      throw new Error(`unknown challenge ${challengeId}`)
    }

    const tx = locks.begin(`${challengeId}:${crypto.randomUUID()}`)
    try {
      for (let idx = 0; idx < solveOrder.length; idx++) {
        const userId = solveOrder[idx]!
        await tx.lock(userId)
        lockEvents.push({ challengeId, userId })
        if (idx === 0) {
          await Promise.resolve()
        }
      }
      completed.push(challengeId)
    } catch (error) {
      if ((error as { code?: string }).code === '40P01') {
        deadlocks.push({ challengeId, error })
      }
      throw error
    } finally {
      tx.release()
    }
  })

  return { applyForChallenge, completed, deadlocks, lockEvents }
}

const createExternallyDeadlockingRecompute = () => {
  const locks = createUserRowLockSimulator()
  let externalConflictUsed = false
  const completed: string[] = []
  const deadlocks: Array<{ challengeId: string; error: unknown }> = []
  const lockEvents: Array<{ challengeId: string; userId: string }> = []

  const applyForChallenge = mock(async (challengeId: string) => {
    const recomputeTx = locks.begin(`${challengeId}:recompute`)
    let externalRelease: (() => void) | undefined
    let externalWait: Promise<void> | undefined

    try {
      if (!externalConflictUsed) {
        externalConflictUsed = true
        const externalTx = locks.begin(`${challengeId}:external`)
        await externalTx.lock('user-2')
        externalRelease = externalTx.release

        await recomputeTx.lock('user-1')
        lockEvents.push({ challengeId, userId: 'user-1' })

        externalWait = externalTx.lock('user-1')
        await Promise.resolve()
      }

      await recomputeTx.lock('user-2')
      lockEvents.push({ challengeId, userId: 'user-2' })
      completed.push(challengeId)
    } catch (error) {
      if ((error as { code?: string }).code === '40P01') {
        deadlocks.push({ challengeId, error })
      }
      throw error
    } finally {
      recomputeTx.release()
      await externalWait?.catch(() => {})
      externalRelease?.()
    }
  })

  return { applyForChallenge, completed, deadlocks, lockEvents }
}

describe('recompute queue deadlock behavior', () => {
  test('per-challenge recomputes avoid deadlocking opposite user-row lock order', async () => {
    const recompute = createOppositeOrderChallengeRecompute()
    const logger = { error: mock(() => {}) }
    const queue = createRecomputeQueue({
      debounceMs: 0,
      applyForChallenge: recompute.applyForChallenge,
      applyForAll: mock(async () => {}),
      onFlushed: mock(async () => {}),
      logger,
    })

    queue.enqueue({
      scope: 'challenge',
      challengeId: 'challenge-b',
      source: 'flag',
    })
    queue.enqueue({
      scope: 'challenge',
      challengeId: 'challenge-a',
      source: 'flag',
    })

    await queue.flush()

    expect({
      completed: [...recompute.completed].sort(),
      deadlocks: recompute.deadlocks.length,
      loggedErrors: logger.error.mock.calls.length,
      pending: queue.hasPending(),
    }).toEqual({
      completed: ['challenge-a', 'challenge-b'],
      deadlocks: 0,
      loggedErrors: 0,
      pending: false,
    })
  })

  test('scheduled deadlocked recompute work self-heals without an external schedule', async () => {
    const recompute = createExternallyDeadlockingRecompute()
    const logger = { error: mock(() => {}) }
    const onFlushed = mock(async () => {})
    const queue = createRecomputeQueue({
      debounceMs: 0,
      applyForChallenge: recompute.applyForChallenge,
      applyForAll: mock(async () => {}),
      onFlushed,
      logger,
    })

    queue.schedule({
      scope: 'challenge',
      challengeId: 'challenge-a',
      source: 'flag',
    })

    expect(await waitUntil(() => onFlushed.mock.calls.length > 0)).toBe(true)
    expect(logger.error).toHaveBeenCalled()
    expect(recompute.deadlocks).toHaveLength(1)

    await waitUntil(
      () => recompute.completed.length === 1 && !queue.hasPending()
    )

    expect({
      completed: recompute.completed,
      pending: queue.hasPending(),
    }).toEqual({
      completed: ['challenge-a'],
      pending: false,
    })
  })
})
