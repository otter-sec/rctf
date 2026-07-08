import { beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('$app/environment', () => ({ browser: false }))

let admin!: typeof import('$lib/query/admin')

beforeAll(async () => {
  admin = await import('$lib/query/admin')
})

describe('nextPageOffset', () => {
  const page = (offset: number, count: number, total: number) => ({
    lastPage: { offset, total },
    items: Array.from({ length: count }, (_, index) => index),
  })

  const cases: [number, number, number, number | undefined][] = [
    [0, 100, 250, 100],
    [100, 100, 250, 200],
    [200, 50, 250, undefined],
    [0, 0, 0, undefined],
    [0, 100, 100, undefined],
  ]

  test.each(cases)(
    'offset=%i count=%i total=%i -> %p',
    (offset, count, total, expected) => {
      const { lastPage, items } = page(offset, count, total)
      expect(admin.nextPageOffset(lastPage, items)).toBe(expected)
    }
  )
})

describe('dataOrNull', () => {
  type Response =
    | { kind: 'good'; data: { value: number } }
    | { kind: 'badEndpoint'; data: null }

  test('returns data for the good response kind', () => {
    const good: Response = { kind: 'good', data: { value: 42 } }
    expect(admin.dataOrNull(good, 'good')).toEqual({ value: 42 })
  })

  test('returns null for a non-good response kind (badEndpoint gating)', () => {
    const bad = { kind: 'badEndpoint', data: null } as Response
    expect(admin.dataOrNull(bad, 'good')).toBeNull()
  })
})
