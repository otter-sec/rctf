import { niceLinearTicks } from '$lib/chart/y-ticks'
import { describe, expect, test } from 'bun:test'

describe('niceLinearTicks', () => {
  test.each([[0], [-5], [NaN], [Infinity]])(
    'falls back to [0, 1] for invalid max %p',
    max => {
      expect(niceLinearTicks(max)).toEqual({ max: 1, values: [0, 1] })
    }
  )

  test('rounds the max up to a nice step multiple', () => {
    const { max, values } = niceLinearTicks(97, 4)
    expect(max).toBe(100)
    expect(values).toEqual([0, 20, 40, 60, 80, 100])
  })

  test('uses a step of at least 1 for small maxima', () => {
    const { max, values } = niceLinearTicks(3, 4)
    expect(max).toBe(3)
    expect(values).toEqual([0, 1, 2, 3])
  })

  test('always starts at zero and ends at the nice max', () => {
    const { max, values } = niceLinearTicks(1234, 4)
    expect(values[0]).toBe(0)
    expect(values[values.length - 1]).toBe(max)
    expect(max).toBeGreaterThanOrEqual(1234)
  })

  test('produces evenly spaced values', () => {
    const { values } = niceLinearTicks(50, 5)
    const step = values[1]! - values[0]!
    for (let i = 1; i < values.length; i++) {
      expect(values[i]! - values[i - 1]!).toBe(step)
    }
  })
})
