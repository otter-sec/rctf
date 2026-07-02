import type { ScaleFn } from '$lib/chart/scale'

/**
 * Nearest-sample hit testing for chart hover. A plain linear scan over every
 * sample in pixel space: series are windowed (top-N) before this runs, so a
 * quadtree would be premature.
 */

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
  distPx: number
}

/**
 * Finds the sample across all `seriesList` closest to (`targetX`, `targetY`) in
 * pixel space, projecting data points through `xScale`/`yScale` first. Returns
 * null when there are no samples. Ties keep the first-seen sample.
 */
export function nearestPoint(
  seriesList: Series[],
  targetX: number,
  targetY: number,
  xScale: ScaleFn,
  yScale: ScaleFn
): NearestResult | null {
  let best: NearestResult | null = null
  for (const series of seriesList) {
    for (const point of series.points) {
      const dx = xScale(point.x) - targetX
      const dy = yScale(point.y) - targetY
      const distPx = Math.sqrt(dx * dx + dy * dy)
      if (best === null || distPx < best.distPx) {
        best = { seriesId: series.id, point, distPx }
      }
    }
  }
  return best
}
