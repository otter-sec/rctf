import { monotoneCubicPath, type Point } from '$lib/chart/path'
import { describe, expect, test } from 'bun:test'

describe('monotoneCubicPath', () => {
  test('returns an empty string for no points', () => {
    expect(monotoneCubicPath([])).toBe('')
  })

  test('returns a lone move-to for a single point', () => {
    expect(monotoneCubicPath([{ x: 3, y: 4 }])).toBe('M3,4')
  })

  test('returns a straight line segment for two points', () => {
    expect(
      monotoneCubicPath([
        { x: 0, y: 0 },
        { x: 10, y: 20 },
      ])
    ).toBe('M0,0L10,20')
  })

  test.each<[Point[]]>([
    [[]],
    [[{ x: 1, y: 2 }]],
    [
      [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ],
    ],
    [
      [
        { x: 0, y: 0 },
        { x: 1, y: 10 },
        { x: 2, y: 5 },
        { x: 3, y: 30 },
        { x: 4, y: 12 },
      ],
    ],
  ])('never emits NaN in the path for case %#', points => {
    expect(monotoneCubicPath(points)).not.toContain('NaN')
  })

  test('emits cubic bezier segments for three or more points', () => {
    const d = monotoneCubicPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ])
    expect(d.startsWith('M0,0')).toBe(true)
    expect(d).toContain('C')
    expect(d).not.toContain('NaN')
  })

  test('does not overshoot a plateau (monotone constraint)', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 100 },
      { x: 2, y: 100 },
      { x: 3, y: 100 },
    ]
    const d = monotoneCubicPath(points)
    const numbers = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    const ys = numbers.filter((_, index) => index % 2 === 1)
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    }
  })

  test('handles duplicate x samples without NaN', () => {
    const d = monotoneCubicPath([
      { x: 0, y: 0 },
      { x: 0, y: 5 },
      { x: 1, y: 10 },
    ])
    expect(d).not.toContain('NaN')
  })

  test('handles a flat constant-y series without NaN', () => {
    const d = monotoneCubicPath([
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
      { x: 3, y: 5 },
    ])
    expect(d).not.toContain('NaN')
  })
})
