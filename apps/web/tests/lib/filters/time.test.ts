import {
  clearTimeRangeFilter,
  createTimeRangeFilter,
  hasTimeRangeFilter,
  parseRelativeOffset,
  resolveTimeRangeFilter,
  timeRangeFingerprint,
  type TimeRangeFilter,
} from '$lib/filters/time'
import { describe, expect, test } from 'bun:test'

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

describe('parseRelativeOffset', () => {
  test('sums multiple terms (2d 4h)', () => {
    expect(parseRelativeOffset('2d 4h')).toBe(2 * DAY + 4 * HOUR)
  })

  test('reads a single unit (90min)', () => {
    expect(parseRelativeOffset('90min')).toBe(90 * MINUTE)
  })

  test('strips a leading t prefix and applies the sign (t -30m)', () => {
    expect(parseRelativeOffset('t -30m')).toBe(-30 * MINUTE)
  })

  test('treats a bare number as minutes (45)', () => {
    expect(parseRelativeOffset('45')).toBe(45 * MINUTE)
  })

  test('honors a leading plus on a bare number (+15)', () => {
    expect(parseRelativeOffset('+15')).toBe(15 * MINUTE)
  })

  test('accepts commas as term separators (2d,4h)', () => {
    expect(parseRelativeOffset('2d,4h')).toBe(2 * DAY + 4 * HOUR)
  })

  test('rejects unknown units (2x)', () => {
    expect(parseRelativeOffset('2x')).toBeUndefined()
  })

  test('rejects leftover text (2d foo)', () => {
    expect(parseRelativeOffset('2d foo')).toBeUndefined()
  })

  test('rejects empty input', () => {
    expect(parseRelativeOffset('')).toBeUndefined()
    expect(parseRelativeOffset('   ')).toBeUndefined()
  })
})

describe('createTimeRangeFilter / clearTimeRangeFilter', () => {
  test('a fresh filter is absolute with empty fields', () => {
    expect(createTimeRangeFilter()).toEqual({
      mode: 'absolute',
      start: '',
      end: '',
      relativeStart: '',
      relativeEnd: '',
    })
  })

  test('clear resets every field back to the fresh state', () => {
    const filter: TimeRangeFilter = {
      mode: 'relative',
      start: '2020-01-01T00:00',
      end: '2020-01-02T00:00',
      relativeStart: '1h',
      relativeEnd: '2h',
    }
    clearTimeRangeFilter(filter)
    expect(filter).toEqual(createTimeRangeFilter())
  })
})

describe('hasTimeRangeFilter', () => {
  test('is false for a fresh filter', () => {
    expect(hasTimeRangeFilter(createTimeRangeFilter())).toBe(false)
  })

  test('reads the active pair for the current mode', () => {
    const absolute = createTimeRangeFilter()
    absolute.relativeStart = '1h'
    expect(hasTimeRangeFilter(absolute)).toBe(false)
    absolute.start = '2020-01-01T00:00'
    expect(hasTimeRangeFilter(absolute)).toBe(true)

    const relative = createTimeRangeFilter()
    relative.mode = 'relative'
    relative.start = '2020-01-01T00:00'
    expect(hasTimeRangeFilter(relative)).toBe(false)
    relative.relativeStart = '1h'
    expect(hasTimeRangeFilter(relative)).toBe(true)
  })
})

describe('resolveTimeRangeFilter', () => {
  test('empty filter resolves to no bounds', () => {
    expect(resolveTimeRangeFilter(createTimeRangeFilter(), null)).toEqual({})
  })

  test('relative mode without a ctf start time is unavailable', () => {
    const filter = createTimeRangeFilter()
    filter.mode = 'relative'
    filter.relativeStart = '1h'
    expect(resolveTimeRangeFilter(filter, null)).toEqual({
      error: 'CTF start time is unavailable.',
    })
  })

  test('reports an invalid absolute start time', () => {
    const filter = createTimeRangeFilter()
    filter.start = 'not-a-date'
    expect(resolveTimeRangeFilter(filter, null)).toEqual({
      error: 'Enter a valid start time.',
    })
  })

  test('reports an invalid absolute end time', () => {
    const filter = createTimeRangeFilter()
    filter.end = 'not-a-date'
    expect(resolveTimeRangeFilter(filter, null)).toEqual({
      error: 'Enter a valid end time.',
    })
  })

  test('reports an invalid relative start time', () => {
    const filter = createTimeRangeFilter()
    filter.mode = 'relative'
    filter.relativeStart = '2x'
    expect(resolveTimeRangeFilter(filter, 0)).toEqual({
      error: 'Enter a valid relative start time.',
    })
  })

  test('start after end is rejected with no bounds emitted', () => {
    const filter = createTimeRangeFilter()
    filter.start = '2020-01-02T00:00'
    filter.end = '2020-01-01T00:00'
    const result = resolveTimeRangeFilter(filter, null)
    expect(result).toEqual({ error: 'Start must happen before end.' })
    expect(result.createdAfter).toBeUndefined()
    expect(result.createdBefore).toBeUndefined()
  })

  test('resolves absolute bounds to ISO strings', () => {
    const filter = createTimeRangeFilter()
    filter.start = '2020-01-01T00:00'
    filter.end = '2020-01-02T00:00'
    const result = resolveTimeRangeFilter(filter, null)
    expect(result.error).toBeUndefined()
    expect(result.createdAfter).toBe(new Date('2020-01-01T00:00').toISOString())
    expect(result.createdBefore).toBe(
      new Date('2020-01-02T00:00').toISOString()
    )
  })

  test('resolves relative bounds against the ctf start time', () => {
    const filter = createTimeRangeFilter()
    filter.mode = 'relative'
    filter.relativeStart = '0'
    filter.relativeEnd = '1h'
    const result = resolveTimeRangeFilter(filter, 1_000_000)
    expect(result.createdAfter).toBe(new Date(1_000_000).toISOString())
    expect(result.createdBefore).toBe(new Date(1_000_000 + HOUR).toISOString())
  })
})

describe('timeRangeFingerprint', () => {
  test('joins the trimmed fields with the mode', () => {
    const filter: TimeRangeFilter = {
      mode: 'relative',
      start: ' a ',
      end: ' b ',
      relativeStart: ' c ',
      relativeEnd: ' d ',
    }
    expect(timeRangeFingerprint(filter)).toBe('relative:a:b:c:d')
  })
})
