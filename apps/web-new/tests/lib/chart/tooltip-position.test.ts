import { clampBoxPosition } from '$lib/chart/tooltip-position'
import { describe, expect, test } from 'bun:test'

const chart = { width: 400, height: 300 }
const box = { width: 100, height: 50 }
const gap = 8

describe('clampBoxPosition', () => {
  test('places the box to the right of anchors in the left half', () => {
    const { x } = clampBoxPosition({ x: 100, y: 150 }, box, chart, gap)
    expect(x).toBe(108)
  })

  test('places the box to the left of anchors in the right half', () => {
    const { x } = clampBoxPosition({ x: 300, y: 150 }, box, chart, gap)
    expect(x).toBe(300 - box.width - gap)
  })

  test('vertically centers the box on the anchor', () => {
    const { y } = clampBoxPosition({ x: 100, y: 150 }, box, chart, gap)
    expect(y).toBe(150 - box.height / 2)
  })

  test('clamps to the top and left edges', () => {
    const position = clampBoxPosition({ x: 0, y: 0 }, box, chart, gap)
    expect(position.x).toBeGreaterThanOrEqual(4)
    expect(position.y).toBe(4)
  })

  test('clamps to the bottom and right edges', () => {
    const position = clampBoxPosition(
      { x: chart.width, y: chart.height },
      box,
      chart,
      gap
    )
    expect(position.x).toBeLessThanOrEqual(chart.width - box.width - 4)
    expect(position.y).toBe(chart.height - box.height - 4)
  })

  test('keeps a 4px floor when the box is larger than the chart', () => {
    const position = clampBoxPosition(
      { x: 10, y: 10 },
      { width: 500, height: 400 },
      chart,
      gap
    )
    expect(position.x).toBe(4)
    expect(position.y).toBe(4)
  })
})
