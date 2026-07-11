import {
  formatRelativeHours,
  formatRelativeHoursMinutes,
} from '$lib/utils/time'
import { describe, expect, test } from 'bun:test'

const HOUR = 3_600_000
const MINUTE = 60_000

describe('formatRelativeHours', () => {
  const cases: [number, string][] = [
    [0, '0h'],
    [HOUR, '+1h'],
    [26 * HOUR, '+26h'],
    [-HOUR, '-1h'],
    [-3 * HOUR, '-3h'],
  ]

  test.each(cases)('offset=%i -> %s', (offset, expected) => {
    expect(formatRelativeHours(offset, 0)).toBe(expected)
  })
})

describe('formatRelativeHoursMinutes', () => {
  const cases: [number, string][] = [
    [0, '0h'],
    [30 * MINUTE, '+0h 30m'],
    [90 * MINUTE, '+1h 30m'],
    [2 * HOUR, '+2h'],
    [-30 * MINUTE, '-0h 30m'],
    [-90 * MINUTE, '-1h 30m'],
    [-2 * HOUR, '-2h'],
  ]

  test.each(cases)('offset=%i -> %s', (offset, expected) => {
    expect(formatRelativeHoursMinutes(offset, 0)).toBe(expected)
  })
})
