import type { Challenge } from '@rctf/types'
import { describe, expect, test } from 'bun:test'
import {
  computeStats,
  deriveAccordionValue,
  filterChallenges,
  groupChallenges,
  resolveCategory,
} from './challenges-list-logic'

function makeChallenge(
  overrides: Partial<Challenge> & Pick<Challenge, 'id'>
): Challenge {
  return {
    name: overrides.id,
    description: '',
    category: 'misc',
    author: 'author',
    files: [],
    points: 100,
    solves: 0,
    sortWeight: null,
    tags: null,
    instancerLifetime: null,
    instancerExtendable: false,
    instancerStoppable: false,
    instancerActions: [],
    adminBotInputs: null,
    hasFlag: true,
    ...overrides,
  }
}

describe('resolveCategory', () => {
  test.each([
    ['binary', 'pwn'],
    ['rev', 'reverse'],
    ['cryptography', 'crypto'],
    ['pwn', 'pwn'],
    ['steganography', 'steganography'],
  ])('maps %p to %p', (raw, expected) => {
    expect(resolveCategory(raw)).toBe(expected)
  })

  test.each([
    ['Binary', 'pwn'],
    ['REV', 'reverse'],
    ['Web', 'web'],
    ['Unknown-Thing', 'unknown-thing'],
  ])('lowercases before resolving %p to %p', (raw, expected) => {
    expect(resolveCategory(raw)).toBe(expected)
  })
})

describe('groupChallenges', () => {
  test('orders known categories by the fixed priority list', () => {
    const challenges = [
      makeChallenge({ id: 'w', category: 'web' }),
      makeChallenge({ id: 'p', category: 'pwn' }),
      makeChallenge({ id: 'c', category: 'crypto' }),
    ]
    expect(groupChallenges(challenges).map(group => group.category)).toEqual([
      'pwn',
      'crypto',
      'web',
    ])
  })

  test('sorts unknown categories alphabetically after all known ones', () => {
    const challenges = [
      makeChallenge({ id: 'z', category: 'zeta' }),
      makeChallenge({ id: 'w', category: 'web' }),
      makeChallenge({ id: 'a', category: 'alpha' }),
    ]
    expect(groupChallenges(challenges).map(group => group.category)).toEqual([
      'web',
      'alpha',
      'zeta',
    ])
  })

  test('merges aliased categories into their canonical group', () => {
    const challenges = [
      makeChallenge({ id: 'a', category: 'binary' }),
      makeChallenge({ id: 'b', category: 'pwn' }),
      makeChallenge({ id: 'c', category: 'rev' }),
    ]
    const groups = groupChallenges(challenges)
    expect(groups.map(group => group.category)).toEqual(['pwn', 'reverse'])
    expect(groups[0]?.challenges.map(challenge => challenge.id)).toEqual([
      'a',
      'b',
    ])
  })

  test('sorts within a category by solves desc then name', () => {
    const challenges = [
      makeChallenge({ id: '1', name: 'bravo', category: 'web', solves: 5 }),
      makeChallenge({ id: '2', name: 'alpha', category: 'web', solves: 5 }),
      makeChallenge({ id: '3', name: 'charlie', category: 'web', solves: 20 }),
    ]
    const group = groupChallenges(challenges)[0]
    expect(group?.challenges.map(challenge => challenge.name)).toEqual([
      'charlie',
      'alpha',
      'bravo',
    ])
  })

  test('returns an empty array for no challenges', () => {
    expect(groupChallenges([])).toEqual([])
  })
})

describe('filterChallenges', () => {
  const challenges = [
    makeChallenge({
      id: '1',
      name: 'Baby Rev',
      category: 'reverse',
      author: 'alice',
    }),
    makeChallenge({
      id: '2',
      name: 'Web Warmup',
      category: 'web',
      author: 'bob',
    }),
    makeChallenge({
      id: '3',
      name: 'Crypto Chaos',
      category: 'crypto',
      author: 'carol',
    }),
  ]

  test('matches on name case-insensitively', () => {
    const result = filterChallenges(challenges, {
      query: 'baby',
      hideSolved: false,
      solvedIds: new Set(),
    })
    expect(result.map(challenge => challenge.id)).toEqual(['1'])
  })

  test('matches on category', () => {
    const result = filterChallenges(challenges, {
      query: 'WEB',
      hideSolved: false,
      solvedIds: new Set(),
    })
    expect(result.map(challenge => challenge.id)).toEqual(['2'])
  })

  test('matches on author', () => {
    const result = filterChallenges(challenges, {
      query: 'carol',
      hideSolved: false,
      solvedIds: new Set(),
    })
    expect(result.map(challenge => challenge.id)).toEqual(['3'])
  })

  test('treats whitespace-only queries as no query', () => {
    const result = filterChallenges(challenges, {
      query: '   ',
      hideSolved: false,
      solvedIds: new Set(),
    })
    expect(result).toHaveLength(3)
  })

  test('excludes exactly the solved ids when hideSolved is on', () => {
    const result = filterChallenges(challenges, {
      query: '',
      hideSolved: true,
      solvedIds: new Set(['2']),
    })
    expect(result.map(challenge => challenge.id)).toEqual(['1', '3'])
  })

  test('keeps solved ids when hideSolved is off', () => {
    const result = filterChallenges(challenges, {
      query: '',
      hideSolved: false,
      solvedIds: new Set(['2']),
    })
    expect(result).toHaveLength(3)
  })

  test('combines search and hideSolved', () => {
    const result = filterChallenges(challenges, {
      query: 'o',
      hideSolved: true,
      solvedIds: new Set(['2']),
    })
    // 'o' matches Web Warmup (author bob), Crypto Chaos (name/author carol);
    // Web Warmup is solved and excluded.
    expect(result.map(challenge => challenge.id)).toEqual(['3'])
  })
})

describe('deriveAccordionValue', () => {
  const allCategories = ['pwn', 'crypto', 'web']

  test('opens every category when nothing is collapsed', () => {
    expect(
      deriveAccordionValue({
        allCategories,
        collapsedCategories: [],
        searching: false,
        deepLinkCategory: null,
      })
    ).toEqual(['pwn', 'crypto', 'web'])
  })

  test('respects the persisted collapsed set', () => {
    expect(
      deriveAccordionValue({
        allCategories,
        collapsedCategories: ['crypto'],
        searching: false,
        deepLinkCategory: null,
      })
    ).toEqual(['pwn', 'web'])
  })

  test('forces every category open while searching', () => {
    expect(
      deriveAccordionValue({
        allCategories,
        collapsedCategories: ['crypto', 'web'],
        searching: true,
        deepLinkCategory: null,
      })
    ).toEqual(['pwn', 'crypto', 'web'])
  })

  test('forces a collapsed deep-link category open', () => {
    expect(
      deriveAccordionValue({
        allCategories,
        collapsedCategories: ['crypto', 'web'],
        searching: false,
        deepLinkCategory: 'crypto',
      })
    ).toEqual(['pwn', 'crypto'])
  })

  test('ignores a deep-link category that is not present', () => {
    expect(
      deriveAccordionValue({
        allCategories,
        collapsedCategories: [],
        searching: false,
        deepLinkCategory: 'ghost',
      })
    ).toEqual(['pwn', 'crypto', 'web'])
  })

  test('accepts a Set for the collapsed categories', () => {
    expect(
      deriveAccordionValue({
        allCategories,
        collapsedCategories: new Set(['pwn']),
        searching: false,
        deepLinkCategory: null,
      })
    ).toEqual(['crypto', 'web'])
  })
})

describe('computeStats', () => {
  test('sums points and solves over the unfiltered set', () => {
    const challenges = [
      makeChallenge({ id: '1', points: 100 }),
      makeChallenge({ id: '2', points: 200 }),
      makeChallenge({ id: '3', points: 300 }),
    ]
    expect(computeStats(challenges, new Set(['1', '3']))).toEqual({
      pointsEarned: 400,
      pointsTotal: 600,
      solvedCount: 2,
      totalCount: 3,
    })
  })

  test('reports zeros for an empty challenge set', () => {
    expect(computeStats([], new Set(['1']))).toEqual({
      pointsEarned: 0,
      pointsTotal: 0,
      solvedCount: 0,
      totalCount: 0,
    })
  })

  test('ignores solved ids that are not in the challenge set', () => {
    const challenges = [makeChallenge({ id: '1', points: 50 })]
    expect(computeStats(challenges, new Set(['missing']))).toEqual({
      pointsEarned: 0,
      pointsTotal: 50,
      solvedCount: 0,
      totalCount: 1,
    })
  })
})
