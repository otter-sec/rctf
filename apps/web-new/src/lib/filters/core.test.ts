import { describe, expect, test } from 'bun:test'
import {
  clearFilter,
  clearSearchFilter,
  createFilter,
  createSearchFilter,
  filterFingerprint,
  filterOperatorLabel,
  includeOperatorLabel,
  setFilterMode,
  toggleFilterOption,
  type MultiFilter,
} from './core'

type Option = { id: string }

const idOf = (option: Option) => option.id

describe('createFilter / createSearchFilter', () => {
  test('a fresh multi filter includes and selects nothing', () => {
    expect(createFilter<Option>()).toEqual({ mode: 'include', selected: [] })
  })

  test('a fresh search filter carries an empty search string', () => {
    expect(createSearchFilter<Option>()).toEqual({
      mode: 'include',
      selected: [],
      search: '',
    })
  })
})

describe('setFilterMode / clearFilter / clearSearchFilter', () => {
  test('setFilterMode swaps the mode in place', () => {
    const filter = createFilter<Option>()
    setFilterMode(filter, 'exclude')
    expect(filter.mode).toBe('exclude')
  })

  test('clearFilter resets mode and selection', () => {
    const filter: MultiFilter<Option> = {
      mode: 'exclude',
      selected: [{ id: 'a' }],
    }
    clearFilter(filter)
    expect(filter).toEqual({ mode: 'include', selected: [] })
  })

  test('clearSearchFilter also empties the search string', () => {
    const filter = createSearchFilter<Option>()
    filter.mode = 'exclude'
    filter.selected = [{ id: 'a' }]
    filter.search = 'query'
    clearSearchFilter(filter)
    expect(filter).toEqual({ mode: 'include', selected: [], search: '' })
  })
})

describe('toggleFilterOption', () => {
  test('adds then removes an option (round-trip) keyed by keyFor', () => {
    const filter = createFilter<Option>()
    toggleFilterOption(filter, { id: 'a' }, idOf)
    expect(filter.selected).toEqual([{ id: 'a' }])
    toggleFilterOption(filter, { id: 'a' }, idOf)
    expect(filter.selected).toEqual([])
  })

  test('removes by key even for a different object identity', () => {
    const filter = createFilter<Option>()
    toggleFilterOption(filter, { id: 'a' }, idOf)
    toggleFilterOption(filter, { id: 'b' }, idOf)
    toggleFilterOption(filter, { id: 'a' }, idOf)
    expect(filter.selected).toEqual([{ id: 'b' }])
  })
})

describe('operator labels', () => {
  test('filterOperatorLabel keys off mode then count', () => {
    expect(filterOperatorLabel('exclude', 1)).toBe('is not')
    expect(filterOperatorLabel('exclude', 3)).toBe('is not')
    expect(filterOperatorLabel('include', 1)).toBe('is')
    expect(filterOperatorLabel('include', 2)).toBe('is any of')
  })

  test('includeOperatorLabel singular vs plural', () => {
    expect(includeOperatorLabel(0)).toBe('is')
    expect(includeOperatorLabel(1)).toBe('is')
    expect(includeOperatorLabel(2)).toBe('is any of')
  })
})

describe('filterFingerprint — sorted values (divergence)', () => {
  test('is stable regardless of selection order', () => {
    const forward: MultiFilter<Option> = {
      mode: 'include',
      selected: [{ id: 'a' }, { id: 'b' }],
    }
    const reversed: MultiFilter<Option> = {
      mode: 'include',
      selected: [{ id: 'b' }, { id: 'a' }],
    }
    expect(filterFingerprint(forward, idOf)).toBe('include:a,b')
    expect(filterFingerprint(reversed, idOf)).toBe(
      filterFingerprint(forward, idOf)
    )
  })

  test('encodes the mode', () => {
    const filter: MultiFilter<Option> = {
      mode: 'exclude',
      selected: [{ id: 'x' }],
    }
    expect(filterFingerprint(filter, idOf)).toBe('exclude:x')
  })
})
