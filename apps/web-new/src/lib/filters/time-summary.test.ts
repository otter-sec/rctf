import { describe, expect, test } from 'bun:test'
import { createTimeRangeFilter } from './time'
import { formatTimeRangeSummary } from './time-summary'

const HOUR = 3_600_000
const CTF_START = 1_600_000_000_000

describe('formatTimeRangeSummary', () => {
  test('an empty filter has no summary', () => {
    expect(formatTimeRangeSummary(createTimeRangeFilter(), CTF_START)).toBe('')
  })

  test('relative endpoints render as CTF offsets joined with "to"', () => {
    const filter = createTimeRangeFilter()
    filter.mode = 'relative'
    filter.relativeStart = '2h'
    filter.relativeEnd = '6h'
    expect(formatTimeRangeSummary(filter, CTF_START)).toBe('T+2h to T+6h')
  })

  test('a relative start alone reads as "After <offset>"', () => {
    const filter = createTimeRangeFilter()
    filter.mode = 'relative'
    filter.relativeStart = '90min'
    expect(formatTimeRangeSummary(filter, CTF_START)).toBe('After T+1h, 30m')
  })

  test('a relative end alone reads as "Before <offset>"', () => {
    const filter = createTimeRangeFilter()
    filter.mode = 'relative'
    filter.relativeEnd = '6h'
    expect(formatTimeRangeSummary(filter, CTF_START)).toBe('Before T+6h')
  })

  test('a negative relative offset keeps its sign', () => {
    const filter = createTimeRangeFilter()
    filter.mode = 'relative'
    filter.relativeStart = '-1h'
    expect(formatTimeRangeSummary(filter, CTF_START)).toBe('After T-1h')
  })

  test('absolute bounds join both endpoints with "to"', () => {
    const filter = createTimeRangeFilter()
    filter.start = '2020-01-01T00:00'
    filter.end = '2020-01-02T00:00'
    const summary = formatTimeRangeSummary(filter, CTF_START)
    expect(summary).toContain(' to ')
    expect(summary.startsWith('After ')).toBe(false)
    expect(summary.startsWith('Before ')).toBe(false)
  })

  test('an absolute start alone reads as "After <time>"', () => {
    const filter = createTimeRangeFilter()
    filter.start = '2020-01-01T00:00'
    expect(formatTimeRangeSummary(filter, CTF_START).startsWith('After ')).toBe(
      true
    )
  })

  test('an absolute end alone reads as "Before <time>"', () => {
    const filter = createTimeRangeFilter()
    filter.end = '2020-01-02T00:00'
    expect(
      formatTimeRangeSummary(filter, CTF_START).startsWith('Before ')
    ).toBe(true)
  })

  test('an unresolvable filter reports an invalid range', () => {
    const filter = createTimeRangeFilter()
    filter.mode = 'relative'
    filter.relativeStart = '1h'
    expect(formatTimeRangeSummary(filter, null)).toBe('Invalid time range')
  })
})
