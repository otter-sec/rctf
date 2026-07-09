import { ctfRelativeTicks } from '$lib/chart/ticks'
import { describe, expect, test } from 'bun:test'

const HOUR = 60 * 60 * 1000

describe('ctfRelativeTicks', () => {
  test('returns an empty list for count < 1', () => {
    expect(ctfRelativeTicks(0, HOUR, 0)).toEqual([])
  })

  test('returns a single start tick for count = 1', () => {
    const ticks = ctfRelativeTicks(0, 10 * HOUR, 1)
    expect(ticks).toHaveLength(1)
    expect(ticks[0]!.value).toBe(0)
    expect(ticks[0]!.label).toBe('0h')
  })

  test('spans start to end with evenly spaced values', () => {
    const start = 1000
    const end = start + 12 * HOUR
    const ticks = ctfRelativeTicks(start, end, 7)
    expect(ticks).toHaveLength(7)
    expect(ticks[0]!.value).toBe(start)
    expect(ticks[6]!.value).toBe(end)
    const step = (end - start) / 6
    for (let i = 1; i < 6; i++) {
      expect(ticks[i]!.value).toBeCloseTo(start + step * i)
    }
  })

  test('uses hour labels for spans of 7h or more', () => {
    const ticks = ctfRelativeTicks(0, 12 * HOUR, 3)
    expect(ticks.map(tick => tick.label)).toEqual(['0h', '+6h', '+12h'])
  })

  test('uses hour+minute labels for spans under 7h', () => {
    const ticks = ctfRelativeTicks(0, 3 * HOUR, 3)
    expect(ticks.map(tick => tick.label)).toEqual(['0h', '+1h 30m', '+3h'])
  })

  test('labels are relative to the start timestamp', () => {
    const start = 500 * HOUR
    const ticks = ctfRelativeTicks(start, start + 8 * HOUR, 2)
    expect(ticks[0]!.label).toBe('0h')
    expect(ticks[1]!.label).toBe('+8h')
  })
})
