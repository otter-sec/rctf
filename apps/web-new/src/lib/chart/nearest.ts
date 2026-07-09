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
  targetY: number
): NearestResult | null {
  let best: NearestResult | null = null
  let bestDist2 = Infinity
  for (const series of seriesList) {
    for (let index = 0; index < series.points.length; index++) {
      const point = series.points[index]!
      const dx = point.x - targetX
      const dy = point.y - targetY
      const dist2 = dx * dx + dy * dy
      if (dist2 < bestDist2) {
        bestDist2 = dist2
        best = { seriesId: series.id, point, index, distPx: 0 }
      }
    }
  }
  if (best) {
    best.distPx = Math.sqrt(bestDist2)
  }
  return best
}
