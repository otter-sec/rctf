/**
 * Monotone cubic (Fritsch-Carlson) interpolation to an SVG path string, ported
 * from d3-shape's `curveMonotoneX`. Guarantees no overshoot between samples so
 * cumulative-score lines never dip below or spike above their data points.
 */

export interface Point {
  x: number
  y: number
}

function fmt(v: number): string {
  return String(Math.round(v * 100) / 100)
}

function sign(x: number): number {
  return x < 0 ? -1 : 1
}

// Interior tangent: d3's slope3. The min-of-magnitudes clamp is what enforces
// monotonicity; opposite-signed neighbours yield a zero tangent (a local
// extremum) so the curve flattens instead of overshooting.
function interiorTangent(
  s0: number,
  s1: number,
  h0: number,
  h1: number
): number {
  const total = h0 + h1
  if (total === 0) return 0
  const p = (s0 * h1 + s1 * h0) / total
  return (
    (sign(s0) + sign(s1)) *
      Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
  )
}

// Endpoint tangent: d3's slope2, refined against the adjacent interior tangent.
function endpointTangent(
  secant: number,
  neighbourTangent: number,
  h: number
): number {
  return h === 0 ? neighbourTangent : (3 * secant - neighbourTangent) / 2
}

export function monotoneCubicPath(points: Point[]): string {
  const n = points.length
  if (n === 0) return ''

  const first = points[0]!
  if (n === 1) return `M${fmt(first.x)},${fmt(first.y)}`
  if (n === 2) {
    const second = points[1]!
    return `M${fmt(first.x)},${fmt(first.y)}L${fmt(second.x)},${fmt(second.y)}`
  }

  const dx: number[] = []
  const secant: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const h = b.x - a.x
    dx.push(h)
    secant.push(h === 0 ? 0 : (b.y - a.y) / h)
  }

  const tangent = new Array<number>(n)
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = interiorTangent(secant[i - 1]!, secant[i]!, dx[i - 1]!, dx[i]!)
  }
  tangent[0] = endpointTangent(secant[0]!, tangent[1]!, dx[0]!)
  tangent[n - 1] = endpointTangent(secant[n - 2]!, tangent[n - 2]!, dx[n - 2]!)

  let d = `M${fmt(first.x)},${fmt(first.y)}`
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const h = (b.x - a.x) / 3
    const c1x = a.x + h
    const c1y = a.y + h * tangent[i]!
    const c2x = b.x - h
    const c2y = b.y - h * tangent[i + 1]!
    d += `C${fmt(c1x)},${fmt(c1y)},${fmt(c2x)},${fmt(c2y)},${fmt(b.x)},${fmt(b.y)}`
  }
  return d
}
