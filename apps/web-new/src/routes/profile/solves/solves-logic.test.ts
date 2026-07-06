import { describe, expect, test } from 'bun:test'
import type {
  ChallengeInfo,
  ProfileDynamicScore,
  ProfileSolve,
} from '../analytics/analytics-data'
import {
  buildDisplayRows,
  computeSolvesStats,
  filterRows,
  groupRowsByCategory,
  nextSortMode,
  selectEmptyState,
  sortRowsByMode,
  type DisplayRow,
} from './solves-logic'

function solve(
  overrides: Partial<ProfileSolve> & { id: string }
): ProfileSolve {
  return {
    category: 'web',
    name: overrides.id,
    points: 100,
    awardedPoints: null,
    solves: 1,
    createdAt: 0,
    bloodIndex: null,
    ...overrides,
  }
}

function challenge(
  overrides: Partial<ChallengeInfo> & { id: string }
): ChallengeInfo {
  return {
    name: overrides.id,
    category: 'web',
    points: 100,
    solves: 1,
    ...overrides,
  }
}

function dynamicScore(id: string, points: number): ProfileDynamicScore {
  return { id, points, pointDelta: 0 }
}

function rowById(rows: DisplayRow[], id: string): DisplayRow {
  const row = rows.find(candidate => candidate.id === id)
  if (!row) throw new Error(`no row for ${id}`)
  return row
}

describe('buildDisplayRows', () => {
  test('merges board challenges with solves, marking solved rows', () => {
    const { rows, boardMerged } = buildDisplayRows({
      challenges: [challenge({ id: 'a' }), challenge({ id: 'b' })],
      solves: [solve({ id: 'a', createdAt: 5, bloodIndex: 0 })],
      showUnsolved: true,
    })

    expect(boardMerged).toBe(true)
    expect(rows).toHaveLength(2)
    expect(rowById(rows, 'a')).toMatchObject({
      isSolved: true,
      solvedAt: 5,
      bloodIndex: 0,
    })
    expect(rowById(rows, 'b')).toMatchObject({ isSolved: false })
  })

  test('falls back to solves-only when the board is unavailable', () => {
    const { rows, boardMerged } = buildDisplayRows({
      challenges: null,
      solves: [solve({ id: 'a' }), solve({ id: 'b' })],
      showUnsolved: true,
    })

    expect(boardMerged).toBe(false)
    expect(rows).toHaveLength(2)
    expect(rows.every(row => row.isSolved)).toBe(true)
  })

  test('falls back to solves-only when unsolved rows are not requested', () => {
    const { boardMerged } = buildDisplayRows({
      challenges: [challenge({ id: 'a' })],
      solves: [solve({ id: 'a' })],
      showUnsolved: false,
    })

    expect(boardMerged).toBe(false)
  })

  test('renders a solve for a challenge missing from the board', () => {
    const { rows } = buildDisplayRows({
      challenges: [challenge({ id: 'a' })],
      solves: [
        solve({ id: 'a' }),
        solve({ id: 'gone', name: 'deleted', createdAt: 9 }),
      ],
      showUnsolved: true,
    })

    expect(rows).toHaveLength(2)
    expect(rowById(rows, 'gone')).toMatchObject({
      isSolved: true,
      solvedAt: 9,
    })
  })

  test('dynamic rows carry current dynamic points and never count as solved', () => {
    const { rows } = buildDisplayRows({
      challenges: [challenge({ id: 'a', scoringKind: 'dynamic', points: 500 })],
      solves: [solve({ id: 'a' })],
      dynamicScores: [dynamicScore('a', 321)],
      showUnsolved: true,
    })

    expect(rowById(rows, 'a')).toMatchObject({
      isDynamic: true,
      isSolved: false,
      points: 321,
      solves: null,
    })
  })

  test('dynamic row without a score entry shows zero points', () => {
    const { rows } = buildDisplayRows({
      challenges: [challenge({ id: 'a', scoringKind: 'dynamic', points: 500 })],
      solves: [],
      showUnsolved: true,
    })

    expect(rowById(rows, 'a').points).toBe(0)
  })
})

describe('filterRows', () => {
  const rows = buildDisplayRows({
    challenges: [
      challenge({ id: 'web1', name: 'login bypass', category: 'web' }),
      challenge({ id: 'pwn1', name: 'heap note', category: 'pwn' }),
      challenge({ id: 'dyn1', name: 'dynamic one', scoringKind: 'dynamic' }),
    ],
    solves: [solve({ id: 'web1' })],
    dynamicScores: [dynamicScore('dyn1', 200)],
    showUnsolved: true,
  }).rows

  test('search matches challenge name', () => {
    const result = filterRows(rows, { search: 'heap', hideSolved: false })
    expect(result.map(row => row.id)).toEqual(['pwn1'])
  })

  test('search matches category', () => {
    const result = filterRows(rows, { search: 'pwn', hideSolved: false })
    expect(result.map(row => row.id)).toEqual(['pwn1'])
  })

  test('hide-solved keeps unsolved and dynamic rows', () => {
    const result = filterRows(rows, { search: '', hideSolved: true })
    const ids = result.map(row => row.id).sort()
    expect(ids).toEqual(['dyn1', 'pwn1'])
  })
})

describe('nextSortMode', () => {
  test('cycles category to time to points and wraps around', () => {
    expect(nextSortMode('category')).toBe('time')
    expect(nextSortMode('time')).toBe('points')
    expect(nextSortMode('points')).toBe('category')
  })
})

describe('sortRowsByMode', () => {
  const rows = buildDisplayRows({
    challenges: [
      challenge({ id: 'a', name: 'alpha', points: 100 }),
      challenge({ id: 'b', name: 'bravo', points: 300 }),
      challenge({ id: 'c', name: 'charlie', points: 200 }),
    ],
    solves: [
      solve({ id: 'a', createdAt: 10 }),
      solve({ id: 'c', createdAt: 50 }),
    ],
    showUnsolved: true,
  }).rows

  test('time sorts most recent first, unsolved last by name', () => {
    const result = sortRowsByMode(rows, 'time')
    expect(result.map(row => row.id)).toEqual(['c', 'a', 'b'])
  })

  test('points sorts descending with name tiebreak', () => {
    const result = sortRowsByMode(rows, 'points')
    expect(result.map(row => row.id)).toEqual(['b', 'c', 'a'])
  })

  test('category mode returns rows unchanged', () => {
    const result = sortRowsByMode(rows, 'category')
    expect(result.map(row => row.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('groupRowsByCategory', () => {
  test('orders groups by canonical category order with alphabetical fallback', () => {
    const rows = buildDisplayRows({
      challenges: [
        challenge({ id: 'z', category: 'zeta' }),
        challenge({ id: 'a', category: 'alpha' }),
        challenge({ id: 'w', category: 'web' }),
        challenge({ id: 'p', category: 'pwn' }),
      ],
      solves: [],
      showUnsolved: true,
    }).rows

    const groups = groupRowsByCategory(rows)
    const order = groups.map(group => group.category)
    expect(order.indexOf('pwn')).toBeLessThan(order.indexOf('alpha'))
    expect(order.indexOf('web')).toBeLessThan(order.indexOf('alpha'))
    expect(order.indexOf('alpha')).toBeLessThan(order.indexOf('zeta'))
  })

  test('within a group orders solved-first, then solve count desc, then name', () => {
    const rows = buildDisplayRows({
      challenges: [
        challenge({ id: 'unsolved', name: 'unsolved', solves: 99 }),
        challenge({ id: 'rare', name: 'rare', solves: 2 }),
        challenge({ id: 'common', name: 'common', solves: 40 }),
        challenge({ id: 'tie-b', name: 'bravo', solves: 5 }),
        challenge({ id: 'tie-a', name: 'alpha', solves: 5 }),
      ],
      solves: [
        solve({ id: 'rare', solves: 2 }),
        solve({ id: 'common', solves: 40 }),
        solve({ id: 'tie-b', solves: 5 }),
        solve({ id: 'tie-a', solves: 5 }),
      ],
      showUnsolved: true,
    }).rows

    const [group] = groupRowsByCategory(rows)
    expect(group?.rows.map(row => row.id)).toEqual([
      'common',
      'tie-a',
      'tie-b',
      'rare',
      'unsolved',
    ])
  })
})

describe('computeSolvesStats', () => {
  test('sums static solved plus dynamic current; totals only without dynamics', () => {
    const rows = buildDisplayRows({
      challenges: [
        challenge({ id: 'a', points: 100 }),
        challenge({ id: 'b', points: 200 }),
      ],
      solves: [solve({ id: 'a', points: 100 })],
      showUnsolved: true,
    })

    expect(
      computeSolvesStats({ rows: rows.rows, boardMerged: rows.boardMerged })
    ).toEqual({
      pointsEarned: 100,
      pointsTotal: 300,
      solved: 1,
      total: 2,
    })
  })

  test('suppresses pointsTotal when dynamic challenges exist; counts exclude dynamics', () => {
    const rows = buildDisplayRows({
      challenges: [
        challenge({ id: 'a', points: 100 }),
        challenge({ id: 'd', scoringKind: 'dynamic', points: 500 }),
      ],
      solves: [solve({ id: 'a', points: 100 }), solve({ id: 'd' })],
      dynamicScores: [dynamicScore('d', 250)],
      showUnsolved: true,
    })

    expect(
      computeSolvesStats({ rows: rows.rows, boardMerged: rows.boardMerged })
    ).toEqual({
      pointsEarned: 350,
      pointsTotal: null,
      solved: 1,
      total: 1,
    })
  })

  test('nulls totals in the solves-only fallback', () => {
    const rows = buildDisplayRows({
      challenges: null,
      solves: [solve({ id: 'a', points: 100 })],
      showUnsolved: true,
    })

    expect(
      computeSolvesStats({ rows: rows.rows, boardMerged: rows.boardMerged })
    ).toEqual({
      pointsEarned: 100,
      pointsTotal: null,
      solved: 1,
      total: null,
    })
  })
})

describe('selectEmptyState', () => {
  test('no state while rows render', () => {
    expect(
      selectEmptyState({ totalRowCount: 3, filteredRowCount: 2 })
    ).toBeNull()
  })

  test('no-matches when filtering emptied a non-empty list', () => {
    expect(selectEmptyState({ totalRowCount: 3, filteredRowCount: 0 })).toBe(
      'no-matches'
    )
  })

  test('no-data when there is no board and no solves', () => {
    expect(selectEmptyState({ totalRowCount: 0, filteredRowCount: 0 })).toBe(
      'no-data'
    )
  })
})
