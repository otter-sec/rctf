import { AdminBotJobStatus } from '@rctf/types'
import { beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('$app/environment', () => ({ browser: false }))

let challenges!: typeof import('$lib/query/challenges')

beforeAll(async () => {
  challenges = await import('$lib/query/challenges')
})

const sorted = (ids: Set<string>): string[] => [...ids].sort()

describe('deriveSolvedIds', () => {
  test('unions server and local ids without duplicates', () => {
    const result = challenges.deriveSolvedIds(
      [{ id: 'a' }, { id: 'b' }],
      new Set(['b', 'c'])
    )
    expect(sorted(result)).toEqual(['a', 'b', 'c'])
  })

  test('keeps local ids when server solves are null', () => {
    expect(sorted(challenges.deriveSolvedIds(null, new Set(['x'])))).toEqual([
      'x',
    ])
  })

  test('keeps local ids when server solves are undefined', () => {
    expect(
      sorted(challenges.deriveSolvedIds(undefined, new Set(['x'])))
    ).toEqual(['x'])
  })

  test('returns an empty set when both sources are empty', () => {
    expect(sorted(challenges.deriveSolvedIds([], new Set()))).toEqual([])
  })

  test('returns server ids when the local set is empty', () => {
    expect(
      sorted(challenges.deriveSolvedIds([{ id: 'a' }], new Set()))
    ).toEqual(['a'])
  })
})

describe('deriveBloodIds', () => {
  test('maps bloodIndex 0/1/2 to gold/silver/bronze', () => {
    const result = challenges.deriveBloodIds([
      { id: 'first', bloodIndex: 0 },
      { id: 'second', bloodIndex: 1 },
      { id: 'third', bloodIndex: 2 },
    ])
    expect(sorted(result.gold)).toEqual(['first'])
    expect(sorted(result.silver)).toEqual(['second'])
    expect(sorted(result.bronze)).toEqual(['third'])
  })

  test('ignores solves with null or out-of-range bloodIndex', () => {
    const result = challenges.deriveBloodIds([
      { id: 'a', bloodIndex: null },
      { id: 'b', bloodIndex: 3 },
      { id: 'c', bloodIndex: 0 },
    ])
    expect(sorted(result.gold)).toEqual(['c'])
    expect(sorted(result.silver)).toEqual([])
    expect(sorted(result.bronze)).toEqual([])
  })

  const nullish: [null | undefined][] = [[null], [undefined]]
  test.each(nullish)('returns empty sets for %p solves', solves => {
    const result = challenges.deriveBloodIds(solves)
    expect(sorted(result.gold)).toEqual([])
    expect(sorted(result.silver)).toEqual([])
    expect(sorted(result.bronze)).toEqual([])
  })

  test('collects multiple ids per placement', () => {
    const result = challenges.deriveBloodIds([
      { id: 'a', bloodIndex: 0 },
      { id: 'b', bloodIndex: 0 },
    ])
    expect(sorted(result.gold)).toEqual(['a', 'b'])
  })
})

describe('getNextOffset', () => {
  const cases: [number, number, number, number | undefined][] = [
    [0, 100, 250, 100],
    [100, 100, 250, 200],
    [200, 50, 250, undefined],
    [200, 100, 250, undefined],
    [0, 0, 0, undefined],
    [0, 5, 5, undefined],
    [0, 3, 10, 3],
  ]
  test.each(cases)(
    'lastOffset=%i count=%i total=%i -> %p',
    (lastOffset, count, total, expected) => {
      expect(challenges.getNextOffset(lastOffset, count, total)).toBe(expected)
    }
  )
})

describe('didAdminBotJobBecomeTerminal', () => {
  const job = (id: string, status: AdminBotJobStatus) => ({ id, status })

  test.each([
    [AdminBotJobStatus.QUEUED, AdminBotJobStatus.COMPLETED],
    [AdminBotJobStatus.QUEUED, AdminBotJobStatus.FAILED],
    [AdminBotJobStatus.RUNNING, AdminBotJobStatus.COMPLETED],
    [AdminBotJobStatus.RUNNING, AdminBotJobStatus.FAILED],
  ])('detects %s -> %s for the same job', (previous, current) => {
    expect(
      challenges.didAdminBotJobBecomeTerminal(
        job('job-1', previous),
        job('job-1', current)
      )
    ).toBe(true)
  })

  test.each([
    [AdminBotJobStatus.QUEUED, AdminBotJobStatus.QUEUED],
    [AdminBotJobStatus.QUEUED, AdminBotJobStatus.RUNNING],
    [AdminBotJobStatus.RUNNING, AdminBotJobStatus.RUNNING],
    [AdminBotJobStatus.COMPLETED, AdminBotJobStatus.COMPLETED],
    [AdminBotJobStatus.FAILED, AdminBotJobStatus.FAILED],
  ])('ignores non-terminal transition %s -> %s', (previous, current) => {
    expect(
      challenges.didAdminBotJobBecomeTerminal(
        job('job-1', previous),
        job('job-1', current)
      )
    ).toBe(false)
  })

  test('ignores a terminal status belonging to a different job', () => {
    expect(
      challenges.didAdminBotJobBecomeTerminal(
        job('job-1', AdminBotJobStatus.RUNNING),
        job('job-2', AdminBotJobStatus.COMPLETED)
      )
    ).toBe(false)
  })

  test('ignores initial and missing jobs', () => {
    expect(
      challenges.didAdminBotJobBecomeTerminal(
        null,
        job('job-1', AdminBotJobStatus.COMPLETED)
      )
    ).toBe(false)
    expect(
      challenges.didAdminBotJobBecomeTerminal(
        job('job-1', AdminBotJobStatus.RUNNING),
        null
      )
    ).toBe(false)
  })
})
