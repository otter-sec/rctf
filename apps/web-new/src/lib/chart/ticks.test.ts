import { ctfRelativeTicks } from '$lib/chart/ticks'
import { describe, expect, test } from 'bun:test'

const HOUR = 3_600_000

describe('ctfRelativeTicks', () => {
  test('produces exactly `count` ticks anchored to start and end', () => {
    const start = 1_000_000
    const end = start + 8 * HOUR
    const ticks = ctfRelativeTicks(start, end, 7)
    expect(ticks).toHaveLength(7)
    expect(ticks[0]!.value).toBe(start)
    expect(ticks[6]!.value).toBe(end)
  })

  test('spaces tick values evenly between start and end', () => {
    const ticks = ctfRelativeTicks(0, 6 * HOUR, 7)
    const values = ticks.map(t => t.value)
    expect(values).toEqual([
      0,
      HOUR,
      2 * HOUR,
      3 * HOUR,
      4 * HOUR,
      5 * HOUR,
      6 * HOUR,
    ])
  })

  test('labels a 6h span in minute-aware format (whole hours collapse to +Nh)', () => {
    const ticks = ctfRelativeTicks(0, 6 * HOUR, 7)
    expect(ticks.map(t => t.label)).toEqual([
      '0h',
      '+1h',
      '+2h',
      '+3h',
      '+4h',
      '+5h',
      '+6h',
    ])
  })

  test('labels a sub-7h span with minutes when ticks fall off the hour', () => {
    const ticks = ctfRelativeTicks(0, 100 * 60_000, 7)
    expect(ticks.map(t => t.label)).toEqual([
      '0h',
      '+0h 17m',
      '+0h 33m',
      '+0h 50m',
      '+1h 7m',
      '+1h 23m',
      '+1h 40m',
    ])
  })

  test('labels an 8h span in hours-only format (rounded to nearest hour)', () => {
    const ticks = ctfRelativeTicks(0, 8 * HOUR, 7)
    expect(ticks.map(t => t.label)).toEqual([
      '0h',
      '+1h',
      '+3h',
      '+4h',
      '+5h',
      '+7h',
      '+8h',
    ])
  })

  test('labels a 47h span in hours-only format', () => {
    const ticks = ctfRelativeTicks(0, 47 * HOUR, 7)
    expect(ticks.map(t => t.label)).toEqual([
      '0h',
      '+8h',
      '+16h',
      '+24h',
      '+31h',
      '+39h',
      '+47h',
    ])
  })

  test('honours a custom tick count', () => {
    const ticks = ctfRelativeTicks(0, 10 * HOUR, 3)
    expect(ticks).toHaveLength(3)
    expect(ticks.map(t => t.value)).toEqual([0, 5 * HOUR, 10 * HOUR])
  })

  test('returns a single anchored tick when count is 1', () => {
    const ticks = ctfRelativeTicks(1234, 9999, 1)
    expect(ticks).toHaveLength(1)
    expect(ticks[0]!.value).toBe(1234)
    expect(ticks[0]!.label).toBe('0h')
  })
})
