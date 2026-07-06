import { Permissions } from '@rctf/types'
// admin.ts imports $lib/api, which pulls in the SvelteKit virtual module
// $app/environment. bun test can't resolve that, so stub it before the module
// is dynamically imported below. Static imports resolve before mock.module runs,
// hence the dynamic import in beforeAll.
import { beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('$app/environment', () => ({ browser: false }))

let admin!: typeof import('./admin')

beforeAll(async () => {
  admin = await import('./admin')
})

describe('nextPageOffset', () => {
  // A filtered submissions sequence: 250 rows fetched 100 at a time, then a
  // short final page. Offset advances by the page's own length until every row
  // has been read, at which point paging stops.
  const page = (offset: number, count: number, total: number) => ({
    lastPage: { offset, total },
    items: Array.from({ length: count }, (_, index) => index),
  })

  // [offset, count, total, expected]
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

describe('hasPermission', () => {
  const { usersWrite, challsRead } = Permissions

  test('true when the required bit is set', () => {
    expect(admin.hasPermission(usersWrite, usersWrite)).toBe(true)
    expect(admin.hasPermission(usersWrite | challsRead, usersWrite)).toBe(true)
  })

  test('false when the required bit is missing', () => {
    expect(admin.hasPermission(challsRead, usersWrite)).toBe(false)
    expect(admin.hasPermission(0, usersWrite)).toBe(false)
  })

  test('requires every bit of a compound permission', () => {
    const required = usersWrite | challsRead
    expect(admin.hasPermission(usersWrite, required)).toBe(false)
    expect(admin.hasPermission(required, required)).toBe(true)
  })
})
