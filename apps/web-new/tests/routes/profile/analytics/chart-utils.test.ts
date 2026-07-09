import { compactNumber } from '$routes/profile/analytics/chart-utils'
import { describe, expect, test } from 'bun:test'

describe('compactNumber', () => {
  test.each([
    [0, '0'],
    [999, '999'],
    [1000, '1k'],
    [1500, '1.5k'],
    [2340, '2.3k'],
    [10000, '10k'],
  ])('formats %p as %p', (input, expected) => {
    expect(compactNumber(input)).toBe(expected)
  })
})
