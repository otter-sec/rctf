import { nearestPoint, type Series } from '$lib/chart/nearest'
import { createLinearScale } from '$lib/chart/scale'
import { describe, expect, test } from 'bun:test'

const identity = createLinearScale([0, 100], [0, 100])

describe('nearestPoint', () => {
  test('returns null for an empty series list', () => {
    expect(nearestPoint([], 10, 10, identity, identity)).toBeNull()
  })

  test('returns null when all series have no points', () => {
    const series: Series[] = [{ id: 'a', points: [] }]
    expect(nearestPoint(series, 10, 10, identity, identity)).toBeNull()
  })

  test('finds the closest point across multiple series', () => {
    const series: Series[] = [
      {
        id: 'a',
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
        ],
      },
      { id: 'b', points: [{ x: 40, y: 45 }] },
    ]
    const result = nearestPoint(series, 42, 44, identity, identity)
    expect(result).not.toBeNull()
    expect(result!.seriesId).toBe('b')
    expect(result!.index).toBe(0)
  })

  test('reports the index within the owning series', () => {
    const series: Series[] = [
      {
        id: 'a',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
          { x: 20, y: 20 },
        ],
      },
    ]
    const result = nearestPoint(series, 11, 11, identity, identity)
    expect(result!.index).toBe(1)
    expect(result!.point).toEqual({ x: 10, y: 10 })
  })

  test('computes distance in pixel space via the scales', () => {
    const xScale = createLinearScale([0, 10], [0, 100])
    const yScale = createLinearScale([0, 10], [100, 0])
    const series: Series[] = [{ id: 'a', points: [{ x: 5, y: 5 }] }]
    const result = nearestPoint(series, 50, 50, xScale, yScale)
    expect(result!.distPx).toBe(0)
  })

  test('ties keep the earlier point', () => {
    const series: Series[] = [
      { id: 'a', points: [{ x: 10, y: 0 }] },
      { id: 'b', points: [{ x: 30, y: 0 }] },
    ]
    const result = nearestPoint(series, 20, 0, identity, identity)
    expect(result!.seriesId).toBe('a')
  })
})
