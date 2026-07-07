import { niceLinearTicks } from '$lib/chart/y-ticks'
import { describe, expect, test } from 'bun:test'

describe('niceLinearTicks', () => {
  test('rounds the max up to a nice value and steps from zero', () => {
    const { max, values } = niceLinearTicks(1337, 4)
    expect(max).toBe(1500)
    expect(values).toEqual([0, 500, 1000, 1500])
  })

  test('keeps an already-nice max and includes both endpoints', () => {
    const { max, values } = niceLinearTicks(1000, 4)
    expect(max).toBe(1000)
    expect(values).toEqual([0, 200, 400, 600, 800, 1000])
  })

  test('never overshoots the requested max with a too-coarse step', () => {
    const { max, values } = niceLinearTicks(500, 5)
    expect(max).toBe(500)
    expect(values.at(-1)).toBe(500)
    expect(values[0]).toBe(0)
  })

  test('degenerate max collapses to a unit axis rather than NaN', () => {
    expect(niceLinearTicks(0)).toEqual({ max: 1, values: [0, 1] })
    expect(niceLinearTicks(-5)).toEqual({ max: 1, values: [0, 1] })
    expect(niceLinearTicks(Number.POSITIVE_INFINITY)).toEqual({
      max: 1,
      values: [0, 1],
    })
  })

  test('small maxima produce unique integer ticks, never duplicates', () => {
    for (const max of [1, 2, 3, 4, 5]) {
      for (const count of [3, 4, 5]) {
        const { values } = niceLinearTicks(max, count)
        expect(new Set(values).size).toBe(values.length)
        expect(values).toEqual(values.map(Math.round))
      }
    }
    expect(niceLinearTicks(2, 3).values).toEqual([0, 1, 2])
  })

  test('the nice max is always at or above the data max', () => {
    for (const input of [1, 7, 42, 99, 333, 4096, 65_537]) {
      expect(niceLinearTicks(input).max).toBeGreaterThanOrEqual(input)
    }
  })
})
