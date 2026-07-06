import { describe, expect, test } from 'bun:test'
import type { MultiFilter } from './core'
import { addFilterParams, addTimeRangeParams } from './query'
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
