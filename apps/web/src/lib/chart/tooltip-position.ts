export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi)

export function clampBoxPosition(
  anchor: Point,
  box: Size,
  chart: Size,
  gap: number
): Point {
  const x = clamp(
    anchor.x > chart.width / 2 ? anchor.x - box.width - gap : anchor.x + gap,
    4,
    Math.max(4, chart.width - box.width - 4)
  )
  const y = clamp(
    anchor.y - box.height / 2,
    4,
    Math.max(4, chart.height - box.height - 4)
  )
  return { x, y }
}
