import { clampBoxPosition } from '$lib/chart/tooltip-position'
import { describe, expect, test } from 'bun:test'

const chart = { width: 400, height: 200 }
const box = { width: 184, height: 60 }

describe('clampBoxPosition', () => {
  test('places the box to the right of the anchor before mid-chart', () => {
    const result = clampBoxPosition({ x: 50, y: 100 }, box, chart, 12)
    expect(result).toEqual({ x: 62, y: 70 })
  })

  test('flips the box to the left of the anchor past mid-chart', () => {
    const result = clampBoxPosition({ x: 350, y: 100 }, box, chart, 12)
    expect(result).toEqual({ x: 154, y: 70 })
  })

  test('flips exactly at mid-chart (anchor.x === chart.width / 2 stays right)', () => {
    const result = clampBoxPosition({ x: 200, y: 100 }, box, chart, 12)
    expect(result).toEqual({ x: 212, y: 70 })
  })

  test('clamps the left edge when the anchor sits near x = 0', () => {
    const result = clampBoxPosition({ x: -50, y: 100 }, box, chart, 12)
    expect(result.x).toBe(4)
  })

  test('clamps the right edge when the anchor sits past the chart width', () => {
    const result = clampBoxPosition({ x: 450, y: 100 }, box, chart, 12)
    expect(result.x).toBe(chart.width - box.width - 4)
  })

  test('clamps the top edge when the anchor sits near y = 0', () => {
    const result = clampBoxPosition({ x: 50, y: -50 }, box, chart, 12)
    expect(result.y).toBe(4)
  })

  test('clamps the bottom edge when the anchor sits past the chart height', () => {
    const result = clampBoxPosition({ x: 50, y: 250 }, box, chart, 12)
    expect(result.y).toBe(chart.height - box.height - 4)
  })

  test('clamps a box wider than the chart to the left inset', () => {
    const wideBox = { width: 500, height: 60 }
    const result = clampBoxPosition({ x: 50, y: 100 }, wideBox, chart, 12)
    expect(result.x).toBe(4)
  })

  test('matches the chart-tooltip formula for a right-side placement', () => {
    // Mirrors src/lib/chart/chart-tooltip.svelte's pre-extraction boxX/boxY.
    const anchor = { x: 120, y: 80 }
    const ttBox = { width: 184, height: 64 }
    const ttChart = { width: 320, height: 180 }
    const gap = 12
    const expectedX = Math.min(
      Math.max(anchor.x + gap, 4),
      Math.max(4, ttChart.width - ttBox.width - 4)
    )
    const expectedY = Math.min(
      Math.max(anchor.y - ttBox.height / 2, 4),
      Math.max(4, ttChart.height - ttBox.height - 4)
    )
    expect(clampBoxPosition(anchor, ttBox, ttChart, gap)).toEqual({
      x: expectedX,
      y: expectedY,
    })
  })

  test('matches the profile-solve-tooltip formula for a left-flip placement', () => {
    // Mirrors src/routes/profile/analytics/solve-tooltip.svelte's pre-extraction boxX/boxY.
    const anchor = { x: 300, y: 40 }
    const ttBox = { width: 220, height: 92 }
    const ttChart = { width: 400, height: 100 }
    const gap = 12
    const expectedX = Math.min(
      Math.max(anchor.x - ttBox.width - gap, 4),
      Math.max(4, ttChart.width - ttBox.width - 4)
    )
    const expectedY = Math.min(
      Math.max(anchor.y - ttBox.height / 2, 4),
      Math.max(4, ttChart.height - ttBox.height - 4)
    )
    expect(clampBoxPosition(anchor, ttBox, ttChart, gap)).toEqual({
      x: expectedX,
      y: expectedY,
    })
  })
})
