import type { PostgresClient } from '@rctf/db'
import { describe, expect, mock, test } from 'bun:test'
import { createLeaderElection } from '../../../../apps/api/src/workers/leader-election'

type QueryHandler = (query: string) => unknown[] | Promise<unknown[]>

const createFakeLockClient = (handle: QueryHandler) => {
  const queries: string[] = []
  const end = mock(async () => {})
  const client = Object.assign(
    (strings: TemplateStringsArray, ..._params: unknown[]) => {
      const query = strings.join('?')
      queries.push(query)
      return Promise.resolve().then(() => handle(query))
    },
    { end }
  )
  return { client: client as unknown as PostgresClient, queries, end }
}

const createLogger = () => ({
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
})

const waitFor = async (condition: () => boolean): Promise<void> => {
  const deadline = Date.now() + 1_000
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('condition not met in time')
    }
    await new Promise(resolve => setTimeout(resolve, 1))
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const baseOptions = {
  sql: 'postgres://unused',
  lockKey: 1,
  pollIntervalMs: 1,
}

describe('leader election', () => {
  test('acquires leadership when the lock is free and fires onAcquired once', async () => {
    const { client } = createFakeLockClient(query => {
      if (query.includes('pg_try_advisory_lock')) {
        return [{ locked: true, pid: 1 }]
      }
      return [{ pid: 1 }]
    })
    const onAcquired = mock(() => {})
    const election = createLeaderElection({
      ...baseOptions,
      onAcquired,
      logger: createLogger(),
      client,
    })

    election.start()
    await waitFor(() => election.isLeader())
    await sleep(20)

    expect(election.isLeader()).toBe(true)
    expect(onAcquired).toHaveBeenCalledTimes(1)
    await election.stop()
  })

  test('stays standby while the lock is held elsewhere', async () => {
    let polls = 0
    const { client } = createFakeLockClient(query => {
      if (query.includes('pg_try_advisory_lock')) {
        polls++
        return [{ locked: false, pid: 1 }]
      }
      return [{ pid: 1 }]
    })
    const onAcquired = mock(() => {})
    const election = createLeaderElection({
      ...baseOptions,
      onAcquired,
      logger: createLogger(),
      client,
    })

    election.start()
    await waitFor(() => polls >= 3)

    expect(election.isLeader()).toBe(false)
    expect(onAcquired).not.toHaveBeenCalled()
    await election.stop()
  })

  test('detects a backend pid change and re-elects', async () => {
    let pid = 1
    const { client } = createFakeLockClient(query => {
      if (query.includes('pg_try_advisory_lock')) {
        return [{ locked: true, pid }]
      }
      return [{ pid }]
    })
    const onAcquired = mock(() => {})
    const onLost = mock(() => {})
    const election = createLeaderElection({
      ...baseOptions,
      onAcquired,
      onLost,
      logger: createLogger(),
      client,
    })

    election.start()
    await waitFor(() => election.isLeader())

    pid = 2
    await waitFor(() => onLost.mock.calls.length === 1)
    await waitFor(() => onAcquired.mock.calls.length === 2)

    expect(election.isLeader()).toBe(true)
    await election.stop()
  })

  test('tolerates transient poll failures below the threshold', async () => {
    let remainingFailures = 0
    const { client } = createFakeLockClient(query => {
      if (remainingFailures > 0) {
        remainingFailures--
        throw new Error('transient poll error')
      }
      if (query.includes('pg_try_advisory_lock')) {
        return [{ locked: true, pid: 1 }]
      }
      return [{ pid: 1 }]
    })
    const onLost = mock(() => {})
    const election = createLeaderElection({
      ...baseOptions,
      onLost,
      logger: createLogger(),
      client,
    })

    election.start()
    await waitFor(() => election.isLeader())

    remainingFailures = 2
    await waitFor(() => remainingFailures === 0)
    await sleep(20)

    expect(election.isLeader()).toBe(true)
    expect(onLost).not.toHaveBeenCalled()
    await election.stop()
  })

  test('steps down after consecutive poll failures reach the threshold', async () => {
    let remainingFailures = 0
    const { client } = createFakeLockClient(query => {
      if (remainingFailures > 0) {
        remainingFailures--
        throw new Error('persistent poll error')
      }
      if (query.includes('pg_try_advisory_lock')) {
        return [{ locked: true, pid: 1 }]
      }
      return [{ pid: 1 }]
    })
    const onAcquired = mock(() => {})
    const onLost = mock(() => {})
    const election = createLeaderElection({
      ...baseOptions,
      onAcquired,
      onLost,
      logger: createLogger(),
      client,
    })

    election.start()
    await waitFor(() => election.isLeader())

    remainingFailures = 3
    await waitFor(() => onLost.mock.calls.length === 1)
    await waitFor(() => onAcquired.mock.calls.length === 2)

    expect(election.isLeader()).toBe(true)
    await election.stop()
  })

  test('stop releases the lock and closes the client', async () => {
    const { client, queries, end } = createFakeLockClient(query => {
      if (query.includes('pg_try_advisory_lock')) {
        return [{ locked: true, pid: 1 }]
      }
      return [{ pid: 1 }]
    })
    const election = createLeaderElection({
      ...baseOptions,
      logger: createLogger(),
      client,
    })

    election.start()
    await waitFor(() => election.isLeader())
    await election.stop()

    expect(election.isLeader()).toBe(false)
    expect(queries.some(query => query.includes('pg_advisory_unlock'))).toBe(
      true
    )
    expect(end).toHaveBeenCalledTimes(1)
  })

  test('a poll that wins the lock after stop() does not assume leadership', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    const { client, queries } = createFakeLockClient(query => {
      if (query.includes('pg_try_advisory_lock')) {
        return gate.then(() => [{ locked: true, pid: 1 }])
      }
      return [{ pid: 1 }]
    })
    const onAcquired = mock(() => {})
    const election = createLeaderElection({
      ...baseOptions,
      onAcquired,
      logger: createLogger(),
      client,
    })

    election.start()
    await waitFor(() => queries.length >= 1)

    // stop while the try_lock query is still in flight, then let it win
    const stopPromise = election.stop()
    release!()
    await stopPromise
    await sleep(20)

    expect(election.isLeader()).toBe(false)
    expect(onAcquired).not.toHaveBeenCalled()
  })

  test('stop without leadership skips the unlock but closes the client', async () => {
    const { client, queries, end } = createFakeLockClient(query => {
      if (query.includes('pg_try_advisory_lock')) {
        return [{ locked: false, pid: 1 }]
      }
      return [{ pid: 1 }]
    })
    const election = createLeaderElection({
      ...baseOptions,
      logger: createLogger(),
      client,
    })

    election.start()
    await sleep(10)
    await election.stop()

    expect(queries.some(query => query.includes('pg_advisory_unlock'))).toBe(
      false
    )
    expect(end).toHaveBeenCalledTimes(1)
  })
})
