import { describe, expect, test } from 'bun:test'
import { createFilter, toggleFilterOption, type MultiFilter } from './core'
import { addFilterParams, addTimeRangeParams, defineValueFilter } from './query'
import { createTimeRangeFilter } from './time'

type Option = { id: string }

const idOf = (option: Option) => option.id

function filterWith(mode: MultiFilter<Option>['mode'], ids: string[]) {
  return { mode, selected: ids.map(id => ({ id })) }
}

describe('addFilterParams', () => {
  test('serializes an include filter under the body key', () => {
    const params: Record<string, unknown> = {}
    addFilterParams(params, 'kind', filterWith('include', ['a', 'b']), idOf)
    expect(params).toEqual({ kind: { include: ['a', 'b'] } })
  })

  test('serializes an exclude filter under the body key', () => {
    const params: Record<string, unknown> = {}
    addFilterParams(params, 'kind', filterWith('exclude', ['a', 'b']), idOf)
    expect(params).toEqual({ kind: { exclude: ['a', 'b'] } })
  })

  test('an empty filter emits no key', () => {
    const params: Record<string, unknown> = {}
    addFilterParams(params, 'kind', filterWith('include', []), idOf)
    expect(params).toEqual({})
  })

  test('serverValues remaps the emitted values', () => {
    const params: Record<string, unknown> = {}
    addFilterParams(
      params,
      'status',
      filterWith('include', ['active', 'unverified']),
      idOf,
      values => values.filter(value => value !== 'unverified')
    )
    expect(params).toEqual({ status: { include: ['active'] } })
  })

  test('serverValues stripping everything is treated as an empty filter', () => {
    const params: Record<string, unknown> = {}
    addFilterParams(
      params,
      'status',
      filterWith('include', ['unverified']),
      idOf,
      values => values.filter(value => value !== 'unverified')
    )
    expect(params).toEqual({})
  })
})

describe('addTimeRangeParams', () => {
  test('emits nothing when resolution errors', () => {
    const filter = createTimeRangeFilter()
    filter.start = '2020-01-02T00:00'
    filter.end = '2020-01-01T00:00'
    const params: Record<string, unknown> = {}
    addTimeRangeParams(params, filter, null)
    expect(params).toEqual({})
  })

  test('sets createdAfter/createdBefore on a valid range', () => {
    const filter = createTimeRangeFilter()
    filter.start = '2020-01-01T00:00'
    filter.end = '2020-01-02T00:00'
    const params: Record<string, unknown> = {}
    addTimeRangeParams(params, filter, null)
    expect(params).toEqual({
      createdAfter: new Date('2020-01-01T00:00').toISOString(),
      createdBefore: new Date('2020-01-02T00:00').toISOString(),
    })
  })

  test('emits nothing for an empty filter', () => {
    const params: Record<string, unknown> = {}
    addTimeRangeParams(params, createTimeRangeFilter(), null)
    expect(params).toEqual({})
  })
})

describe('defineValueFilter', () => {
  test('create / has / clear round-trip through the filters record', () => {
    const def = defineValueFilter('kind', 'kind', idOf)
    const filters = { kind: def.create() }
    expect(def.has(filters)).toBe(false)

    toggleFilterOption(filters.kind, { id: 'x' }, idOf)
    expect(def.has(filters)).toBe(true)

    def.clear(filters)
    expect(def.has(filters)).toBe(false)
    expect(filters.kind).toEqual(createFilter<Option>())
  })

  test('addParams serializes via the configured body key', () => {
    const def = defineValueFilter('kind', 'kind', idOf)
    const filters = { kind: filterWith('include', ['x']) }
    const params: Record<string, unknown> = {}
    def.addParams(params, filters)
    expect(params).toEqual({ kind: { include: ['x'] } })
  })

  test('addParams forwards the serverValues hook', () => {
    const def = defineValueFilter('status', 'status', idOf)
    const filters = { status: filterWith('include', ['active', 'unverified']) }
    const params: Record<string, unknown> = {}
    def.addParams(params, filters, values =>
      values.filter(value => value !== 'unverified')
    )
    expect(params).toEqual({ status: { include: ['active'] } })
  })

  test('fingerprint is stable under selection order (sorted)', () => {
    const def = defineValueFilter('kind', 'kind', idOf)
    const forward = { kind: filterWith('include', ['a', 'b']) }
    const reversed = { kind: filterWith('include', ['b', 'a']) }
    expect(def.fingerprint(forward)).toBe('include:a,b')
    expect(def.fingerprint(reversed)).toBe(def.fingerprint(forward))
  })
})
