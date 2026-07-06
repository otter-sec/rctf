import { describe, expect, test } from 'bun:test'
import {
  isDetailRowIndex,
  nextSort,
  resolveExpansion,
  rowIndexForVirtualRow,
  visibleRowCount,
  type SortState,
} from './admin-table-logic'

// Per-column default orders shared by the sort matrix below: score/solves/
// createdAt open descending (largest/newest first), everything else ascending.
const DEFAULTS = {
  team: 'asc',
  createdAt: 'desc',
  score: 'desc',
} as const

type Col = keyof typeof DEFAULTS

function sort(overrides: Partial<SortState<Col>> = {}): SortState<Col> {
  return { by: 'createdAt', order: 'desc', ...overrides }
}

describe('nextSort', () => {
  test('clicking the active column flips its order', () => {
    expect(
      nextSort(sort({ by: 'createdAt', order: 'desc' }), 'createdAt', DEFAULTS)
    ).toEqual({
      by: 'createdAt',
      order: 'asc',
    })
    expect(
      nextSort(sort({ by: 'createdAt', order: 'asc' }), 'createdAt', DEFAULTS)
    ).toEqual({
      by: 'createdAt',
      order: 'desc',
    })
  })

  test('clicking a new column adopts that column default, ignoring the prior order', () => {
    // Prior order was ascending on `team`; switching to `score` must not carry
    // it over — `score` opens on its own default (descending).
    expect(
      nextSort(sort({ by: 'team', order: 'asc' }), 'score', DEFAULTS)
    ).toEqual({
      by: 'score',
      order: 'desc',
    })
    expect(
      nextSort(sort({ by: 'score', order: 'desc' }), 'team', DEFAULTS)
    ).toEqual({
      by: 'team',
      order: 'asc',
    })
  })
})

describe('expansion row math', () => {
  test('visibleRowCount adds one for the spliced detail row when expanded', () => {
    expect(visibleRowCount(10, -1)).toBe(10)
    expect(visibleRowCount(10, 0)).toBe(11)
    expect(visibleRowCount(10, 9)).toBe(11)
  })

  test('isDetailRowIndex marks only the slot right after the expanded row', () => {
    // Row 3 expanded: virtual index 4 is its detail row; 3 and 5 are not.
    expect(isDetailRowIndex(3, 3)).toBe(false)
    expect(isDetailRowIndex(4, 3)).toBe(true)
    expect(isDetailRowIndex(5, 3)).toBe(false)
  })

  test('isDetailRowIndex is never true when nothing is expanded', () => {
    expect(isDetailRowIndex(0, -1)).toBe(false)
    expect(isDetailRowIndex(1, -1)).toBe(false)
  })

  test('rowIndexForVirtualRow shifts rows after the detail row back by one', () => {
    // Expanded at data index 3 → virtual layout [0,1,2,3,detail,4,5,...].
    expect(rowIndexForVirtualRow(2, 3)).toBe(2) // before the expanded row
    expect(rowIndexForVirtualRow(3, 3)).toBe(3) // the expanded row itself
    expect(rowIndexForVirtualRow(5, 3)).toBe(4) // first row after the detail
    expect(rowIndexForVirtualRow(6, 3)).toBe(5)
  })

  test('rowIndexForVirtualRow is identity when nothing is expanded', () => {
    expect(rowIndexForVirtualRow(0, -1)).toBe(0)
    expect(rowIndexForVirtualRow(7, -1)).toBe(7)
  })
})

describe('resolveExpansion', () => {
  test('keeps the expanded id while it is still present', () => {
    expect(resolveExpansion('b', ['a', 'b', 'c'])).toBe('b')
  })

  test('clears when the id left the set (filtered/paged out)', () => {
    expect(resolveExpansion('z', ['a', 'b', 'c'])).toBeNull()
  })

  test('is null when nothing is expanded', () => {
    expect(resolveExpansion(null, ['a', 'b'])).toBeNull()
  })

  test('clears against an empty set', () => {
    expect(resolveExpansion('a', [])).toBeNull()
  })
})
