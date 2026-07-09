import { nearestPoint } from '$lib/chart/nearest'
import { describe, expect, test } from 'bun:test'

const seriesA = {
  id: 'a',
  points: [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
    { x: 20, y: 20 },
  ],
}
const seriesB = {
  id: 'b',
  points: [
    { x: 0, y: 100 },
    { x: 10, y: 90 },
  ],
}

describe('nearestPoint', () => {
  test('returns null for no series', () => {
    expect(nearestPoint([], 5, 5)).toBeNull()
  })

  test('returns null when every series is empty', () => {
    expect(nearestPoint([{ id: 'a', points: [] }], 5, 5)).toBeNull()
  })

  test('finds an exact hit with zero distance', () => {
    const result = nearestPoint([seriesA], 10, 10)
    expect(result).not.toBeNull()
    expect(result!.seriesId).toBe('a')
    expect(result!.point).toEqual({ x: 10, y: 10 })
    expect(result!.distPx).toBe(0)
  })

  test('picks the nearest sample when the target sits between points', () => {
    const result = nearestPoint([seriesA], 12, 11)
    expect(result!.point).toEqual({ x: 10, y: 10 })
  })

  test('reports the point index and euclidean distance', () => {
    const result = nearestPoint([seriesA], 23, 24)
    expect(result!.index).toBe(2)
    expect(result!.distPx).toBe(5)
  })

  test('searches across all series in pixel space', () => {
    const result = nearestPoint([seriesA, seriesB], 0, 95)
    expect(result!.seriesId).toBe('b')
    expect(result!.point).toEqual({ x: 0, y: 100 })
  })

  test('keeps the first series on an exact tie', () => {
    const s1 = { id: 'first', points: [{ x: 0, y: 0 }] }
    const s2 = { id: 'second', points: [{ x: 0, y: 0 }] }
    const result = nearestPoint([s1, s2], 0, 0)
    expect(result!.seriesId).toBe('first')
  })
})
