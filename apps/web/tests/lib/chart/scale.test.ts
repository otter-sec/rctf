import { createLinearScale, createTimeScale } from '$lib/chart/scale'
import { describe, expect, test } from 'bun:test'

describe('createLinearScale', () => {
  test.each([
    [0, 0],
    [10, 100],
    [5, 50],
    [2.5, 25],
  ])('maps domain value %p to range %p', (input, expected) => {
    const scale = createLinearScale([0, 10], [0, 100])
    expect(scale(input)).toBe(expected)
  })

  test('maps an inverted range', () => {
    const scale = createLinearScale([0, 10], [100, 0])
    expect(scale(0)).toBe(100)
    expect(scale(10)).toBe(0)
    expect(scale(5)).toBe(50)
  })

  test('extrapolates beyond the domain without clamping', () => {
    const scale = createLinearScale([0, 10], [0, 100])
    expect(scale(-5)).toBe(-50)
    expect(scale(15)).toBe(150)
  })

  test('clamps inputs to the domain when clamp is set', () => {
    const scale = createLinearScale([0, 10], [0, 100], { clamp: true })
    expect(scale(-5)).toBe(0)
    expect(scale(15)).toBe(100)
    expect(scale(5)).toBe(50)
  })

  test('clamps against an inverted range', () => {
    const scale = createLinearScale([0, 10], [100, 0], { clamp: true })
    expect(scale(-5)).toBe(100)
    expect(scale(15)).toBe(0)
  })

  test('returns a finite constant for a degenerate domain', () => {
    const scale = createLinearScale([5, 5], [0, 100])
    expect(scale(5)).toBe(0)
    expect(scale(0)).toBe(0)
    expect(scale(999)).toBe(0)
    expect(Number.isNaN(scale(5))).toBe(false)
  })
})

describe('createTimeScale', () => {
  test('maps epoch milliseconds linearly across the range', () => {
    const start = 1_700_000_000_000
    const end = start + 3_600_000
    const scale = createTimeScale([start, end], [0, 600])
    expect(scale(start)).toBe(0)
    expect(scale(end)).toBe(600)
    expect(scale(start + 1_800_000)).toBe(300)
  })

  test('does not produce NaN for a single-instant domain', () => {
    const t = 1_700_000_000_000
    const scale = createTimeScale([t, t], [0, 600])
    expect(Number.isNaN(scale(t))).toBe(false)
    expect(scale(t)).toBe(0)
  })
})
