import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_SORT_MODE,
  DEFAULT_VIEW_MODE,
  getActiveSearch,
  resolveSortMode,
  resolveViewMode,
  withScoresChallenge,
  withScoresDivision,
  withScoresSearch,
  withScoresSortMode,
  withScoresViewMode,
} from './url-params'

const BASE = 'https://ctf.example/scores'

function url(search = ''): URL {
  return new URL(`${BASE}${search}`)
}

describe('getActiveSearch', () => {
  test.each([
    ['', undefined],
    ['a', undefined],
    ['ab', 'ab'],
    ['abc', 'abc'],
  ])('%p -> %p', (input, expected) => {
    expect(getActiveSearch(input)).toBe(expected)
  })
})

describe('withScoresSearch', () => {
  test('sets the param when at least 2 characters', () => {
    expect(withScoresSearch(url(), 'ab').searchParams.get('search')).toBe('ab')
  })

  test('omits the param for under 2 characters', () => {
    expect(withScoresSearch(url(), 'a').searchParams.has('search')).toBe(false)
  })

  test('clears an existing param when the value drops below 2 characters', () => {
    const next = withScoresSearch(url('?search=team'), 'a')
    expect(next.searchParams.has('search')).toBe(false)
  })

  test('clears the param on an empty value', () => {
    const next = withScoresSearch(url('?search=team'), '')
    expect(next.searchParams.has('search')).toBe(false)
  })

  test('does not mutate the input url', () => {
    const input = url('?search=team')
    withScoresSearch(input, 'ab')
    expect(input.searchParams.get('search')).toBe('team')
  })
})

describe('withScoresDivision', () => {
  test('sets the param for a value', () => {
    expect(
      withScoresDivision(url(), 'students').searchParams.get('division')
    ).toBe('students')
  })

  test('clears the param for undefined', () => {
    const next = withScoresDivision(url('?division=students'), undefined)
    expect(next.searchParams.has('division')).toBe(false)
  })

  test('clears the param for an empty string', () => {
    const next = withScoresDivision(url('?division=students'), '')
    expect(next.searchParams.has('division')).toBe(false)
  })
})

describe('withScoresViewMode', () => {
  test('omits the default (challenges) from the url', () => {
    const next = withScoresViewMode(url('?view=categories'), 'challenges')
    expect(next.searchParams.has('view')).toBe(false)
  })

  test('sets the non-default (categories)', () => {
    expect(
      withScoresViewMode(url(), 'categories').searchParams.get('view')
    ).toBe('categories')
  })

  test('round-trips categories then back to the default', () => {
    const set = withScoresViewMode(url(), 'categories')
    const cleared = withScoresViewMode(set, 'challenges')
    expect(cleared.searchParams.has('view')).toBe(false)
  })
})

describe('withScoresSortMode', () => {
  test('omits the default (categories) from the url', () => {
    const next = withScoresSortMode(url('?sort=solves'), 'categories')
    expect(next.searchParams.has('sort')).toBe(false)
  })

  test('sets the non-default (solves)', () => {
    expect(withScoresSortMode(url(), 'solves').searchParams.get('sort')).toBe(
      'solves'
    )
  })

  test('round-trips solves then back to the default', () => {
    const set = withScoresSortMode(url(), 'solves')
    const cleared = withScoresSortMode(set, 'categories')
    expect(cleared.searchParams.has('sort')).toBe(false)
  })

  test('drops an active challenge focus when the sort changes', () => {
    const next = withScoresSortMode(url('?challenge=baby-rev'), 'solves')
    expect(next.searchParams.has('challenge')).toBe(false)
  })
})

describe('withScoresChallenge', () => {
  test('sets the param for a challenge id', () => {
    expect(
      withScoresChallenge(url(), 'baby-rev').searchParams.get('challenge')
    ).toBe('baby-rev')
  })

  test('clears the param for null', () => {
    const next = withScoresChallenge(url('?challenge=baby-rev'), null)
    expect(next.searchParams.has('challenge')).toBe(false)
  })

  test('round-trips a challenge id through parse and serialize', () => {
    const set = withScoresChallenge(url(), 'baby-rev')
    expect(set.searchParams.get('challenge')).toBe('baby-rev')
    const cleared = withScoresChallenge(set, null)
    expect(cleared.searchParams.has('challenge')).toBe(false)
  })

  test('does not mutate the input url', () => {
    const input = url('?challenge=baby-rev')
    withScoresChallenge(input, 'other')
    expect(input.searchParams.get('challenge')).toBe('baby-rev')
  })

  test('view changes drop an active challenge focus', () => {
    const next = withScoresViewMode(url('?challenge=baby-rev'), 'categories')
    expect(next.searchParams.has('challenge')).toBe(false)
  })
})

describe('resolveViewMode (AE3 precedence)', () => {
  test('a valid url param wins over a saved preference', () => {
    expect(resolveViewMode('challenges', 'categories', false)).toBe(
      'challenges'
    )
    expect(resolveViewMode('categories', 'challenges', false)).toBe(
      'categories'
    )
  })

  test('a saved preference applies only before the first interaction', () => {
    expect(resolveViewMode(null, 'categories', false)).toBe('categories')
    expect(resolveViewMode(null, 'categories', true)).toBe(DEFAULT_VIEW_MODE)
  })

  test('falls back to the default with no param and no preference', () => {
    expect(resolveViewMode(null, undefined, false)).toBe(DEFAULT_VIEW_MODE)
  })

  test('an invalid url param falls through to the preference', () => {
    expect(resolveViewMode('garbage', 'categories', false)).toBe('categories')
  })
})

describe('resolveSortMode (AE3 precedence)', () => {
  test('a valid url param wins over a saved preference', () => {
    expect(resolveSortMode('solves', 'categories', false)).toBe('solves')
    expect(resolveSortMode('categories', 'solves', false)).toBe('categories')
  })

  test('a saved preference applies only before the first interaction', () => {
    expect(resolveSortMode(null, 'solves', false)).toBe('solves')
    expect(resolveSortMode(null, 'solves', true)).toBe(DEFAULT_SORT_MODE)
  })

  test('falls back to the default with no param and no preference', () => {
    expect(resolveSortMode(null, undefined, false)).toBe(DEFAULT_SORT_MODE)
  })

  test('an invalid url param falls through to the preference', () => {
    expect(resolveSortMode('garbage', 'solves', false)).toBe('solves')
  })
})
