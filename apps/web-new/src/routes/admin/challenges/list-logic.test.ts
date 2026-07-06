import type { AdminChallenge } from '@rctf/types'
import { ChallengeScoringKind, DynamicScoringTransport } from '@rctf/types'
import { describe, expect, test } from 'bun:test'
import {
  accordionValue,
  filterChallenges,
  groupChallenges,
  pointsLabel,
} from './list-logic'

function makeChallenge(
  overrides: Partial<AdminChallenge> & Pick<AdminChallenge, 'id'>
): AdminChallenge {
  return {
    name: overrides.id,
    description: '',
    category: 'misc',
    author: '',
    files: [],
    points: { min: 100, max: 500 },
    flag: '',
    tiebreakEligible: true,
    sortWeight: null,
    tags: null,
    instancerConfig: null,
    adminBotConfig: null,
    hidden: false,
    releaseTime: null,
    scoring: { kind: ChallengeScoringKind.DECAY },
    ...overrides,
  }
}

describe('groupChallenges', () => {
  test('orders groups by canonical category priority, unknown last alphabetically', () => {
    const challenges = [
      makeChallenge({ id: 'z', category: 'zebra' }),
      makeChallenge({ id: 'w', category: 'web' }),
      makeChallenge({ id: 'a', category: 'aardvark' }),
      makeChallenge({ id: 'p', category: 'pwn' }),
    ]
    const groups = groupChallenges(challenges)
    expect(groups.map(g => g.category)).toEqual([
      'pwn',
      'web',
      'aardvark',
      'zebra',
    ])
  })

  test('folds aliases and casing into the canonical category key', () => {
    const challenges = [
      makeChallenge({ id: 'a', category: 'Binary' }),
      makeChallenge({ id: 'b', category: 'pwn' }),
      makeChallenge({ id: 'c', category: 'REV' }),
    ]
    const groups = groupChallenges(challenges)
    expect(groups.map(g => g.category)).toEqual(['pwn', 'reverse'])
    expect(groups[0]?.challenges.map(c => c.id)).toEqual(['a', 'b'])
  })

  test('sorts challenges within a category by name', () => {
    const challenges = [
      makeChallenge({ id: '1', category: 'web', name: 'charlie' }),
      makeChallenge({ id: '2', category: 'web', name: 'alpha' }),
      makeChallenge({ id: '3', category: 'web', name: 'bravo' }),
    ]
    const groups = groupChallenges(challenges)
    expect(groups[0]?.challenges.map(c => c.name)).toEqual([
      'alpha',
      'bravo',
      'charlie',
    ])
  })
})

describe('filterChallenges', () => {
  const challenges = [
    makeChallenge({
      id: 'a',
      name: 'SQL Injection',
      category: 'web',
      author: 'alice',
    }),
    makeChallenge({
      id: 'b',
      name: 'Baby Rev',
      category: 'reverse',
      author: 'bob',
    }),
    makeChallenge({
      id: 'c',
      name: 'ROP Chain',
      category: 'pwn',
      author: 'carol',
    }),
  ]

  test('empty query returns every challenge', () => {
    expect(filterChallenges(challenges, '  ')).toHaveLength(3)
  })

  test('matches on name case-insensitively', () => {
    expect(filterChallenges(challenges, 'sql').map(c => c.id)).toEqual(['a'])
  })

  test('matches on category', () => {
    expect(filterChallenges(challenges, 'reverse').map(c => c.id)).toEqual([
      'b',
    ])
  })

  test('matches on author', () => {
    expect(filterChallenges(challenges, 'CAROL').map(c => c.id)).toEqual(['c'])
  })
})

describe('accordionValue', () => {
  const groups = [
    { category: 'pwn', challenges: [] },
    { category: 'web', challenges: [] },
    { category: 'misc', challenges: [] },
  ]

  test('active search forces every group open regardless of collapsed set', () => {
    expect(
      accordionValue(groups, new Set(['pwn', 'web', 'misc']), true)
    ).toEqual(['pwn', 'web', 'misc'])
  })

  test('without search, collapsed groups are excluded', () => {
    expect(accordionValue(groups, new Set(['web']), false)).toEqual([
      'pwn',
      'misc',
    ])
  })

  test('accepts a plain array for the collapsed set', () => {
    expect(accordionValue(groups, ['pwn', 'misc'], false)).toEqual(['web'])
  })
})

describe('pointsLabel', () => {
  test('shows a single value when min equals max', () => {
    expect(
      pointsLabel(makeChallenge({ id: 'a', points: { min: 500, max: 500 } }))
    ).toBe('500')
  })

  test('shows a range when min differs from max', () => {
    expect(
      pointsLabel(makeChallenge({ id: 'a', points: { min: 50, max: 500 } }))
    ).toBe('50–500')
  })

  test('shows "Dynamic" for dynamic scoring regardless of points', () => {
    const challenge = makeChallenge({
      id: 'a',
      points: { min: 100, max: 200 },
      scoring: {
        kind: ChallengeScoringKind.DYNAMIC,
        source: { transport: DynamicScoringTransport.WEBHOOK, secret: 's' },
      },
    })
    expect(pointsLabel(challenge)).toBe('Dynamic')
  })
})
