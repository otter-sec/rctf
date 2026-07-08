import type { ScaleFn } from '$lib/chart/scale'

export interface SeriesPoint {
  x: number
  y: number
}

export interface Series {
  id: string
  points: SeriesPoint[]
}

export interface NearestResult {
  seriesId: string
  point: SeriesPoint
  index: number
  distPx: number
}

export function nearestPoint(
  seriesList: Series[],
  targetX: number,
  targetY: number,
  xScale: ScaleFn,
  yScale: ScaleFn
): NearestResult | null {
  let best: NearestResult | null = null
  for (const series of seriesList) {
    for (const [index, point] of series.points.entries()) {
      const dx = xScale(point.x) - targetX
      const dy = yScale(point.y) - targetY
      const distPx = Math.sqrt(dx * dx + dy * dy)
      if (best === null || distPx < best.distPx) {
        best = { seriesId: series.id, point, index, distPx }
      }
    }
  }
  return best
}
