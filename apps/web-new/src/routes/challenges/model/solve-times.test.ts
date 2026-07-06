import { describe, expect, test } from 'bun:test'
import { rankVariant, solveTimeLabels, type RankVariant } from './solve-times'

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const START = 1_710_000_000_000
const FIRST_BLOOD = START + 42 * MIN

describe('solveTimeLabels primary — rank 1 (duration from CTF start)', () => {
  test.each([
    [2 * DAY + 3 * HOUR + 4 * MIN, '2d, 3h, 4m'],
    [3 * HOUR, '3h'],
    [5 * MIN, '5m'],
    [1 * DAY, '1d'],
    [45 * SEC, '45s'],
    [0, '0s'],
  ])('start + %pms → %p', (offset, expected) => {
    const { primary } = solveTimeLabels({
      createdAt: START + offset,
      rank: 1,
      ctfStartTime: START,
      firstBloodTime: FIRST_BLOOD,
    })
    expect(primary).toBe(expected)
  })
})

describe('solveTimeLabels primary — rank > 1 (+delta from first blood)', () => {
  test.each([
    [2, 30 * SEC, '+30s'],
    [3, 2 * HOUR, '+2h'],
    [2, 90 * MIN, '+1h, 30m'],
    [5, 1 * DAY + 2 * HOUR, '+1d, 2h'],
  ])('rank %p, firstBlood + %pms → %p', (rank, offset, expected) => {
    const { primary } = solveTimeLabels({
      createdAt: FIRST_BLOOD + offset,
      rank,
      ctfStartTime: START,
      firstBloodTime: FIRST_BLOOD,
    })
    expect(primary).toBe(expected)
  })
})

describe('solveTimeLabels primary — missing first-blood anchor', () => {
  test('rank > 1 with firstBloodTime 0 falls back to duration from start', () => {
    const { primary } = solveTimeLabels({
      createdAt: START + 1 * HOUR,
      rank: 3,
      ctfStartTime: START,
      firstBloodTime: 0,
    })
    expect(primary).toBe('1h')
    expect(primary.startsWith('+')).toBe(false)
  })
})

describe('solveTimeLabels secondary — local time shape (TZ-safe)', () => {
  const localTimeShape = /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} (AM|PM)$/

  test('rank 1 secondary matches the local-time format', () => {
    const { secondary } = solveTimeLabels({
      createdAt: START,
      rank: 1,
      ctfStartTime: START,
      firstBloodTime: FIRST_BLOOD,
    })
    expect(secondary).toMatch(localTimeShape)
  })

  test('rank > 1 secondary matches the local-time format', () => {
    const { secondary } = solveTimeLabels({
      createdAt: FIRST_BLOOD + 5 * MIN,
      rank: 7,
      ctfStartTime: START,
      firstBloodTime: FIRST_BLOOD,
    })
    expect(secondary).toMatch(localTimeShape)
  })
})

describe('rankVariant', () => {
  const cases: [number, boolean, RankVariant][] = [
    [1, false, 'gold'],
    [2, false, 'silver'],
    [3, false, 'bronze'],
    [4, false, 'nth'],
    [100, false, 'nth'],
    [1, true, 'gold'],
    [2, true, 'silver'],
    [3, true, 'bronze'],
    [4, true, 'self'],
    [100, true, 'self'],
  ]

  test.each(cases)('rank %p (self: %p) → %p', (rank, isSelf, expected) => {
    expect(rankVariant(rank, isSelf)).toBe(expected)
  })
})
