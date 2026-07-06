/**
 * Placement math for the shared chart tooltip: flip to the other side of the
 * anchor once it crosses the chart's horizontal midpoint (so the box never
 * covers the hovered point), then clamp the box into the chart bounds with a
 * fixed inset.
 */

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

/**
 * Computes the top-left position for a tooltip `box` anchored near `anchor`
 * inside a `chart` of the given size, leaving `gap` px between the anchor and
 * the box on the flip side, and a 4px inset from every chart edge.
 */
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
