/**
 * Linear scales for the hand-rolled chart core. Pure and DOM-free so they can
 * be unit tested and reused by any consumer (per-challenge graph, scoreboard).
 */

export type ScaleFn = (value: number) => number

export interface ScaleOptions {
  /** Clamp inputs to the domain so outputs never leave the range. */
  clamp?: boolean
}

/**
 * Builds a linear scale mapping `domain` onto `range`.
 *
 * A degenerate domain (min === max) would divide by zero, so it collapses to a
 * constant that returns the range start for every input instead of NaN.
 */
export function createLinearScale(
  domain: [number, number],
  range: [number, number],
  options: ScaleOptions = {}
): ScaleFn {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0

  if (span === 0) {
    return () => r0
  }

  const clamp = options.clamp ?? false
  const lo = Math.min(d0, d1)
  const hi = Math.max(d0, d1)

  return value => {
    const v = clamp ? Math.min(hi, Math.max(lo, value)) : value
    return r0 + ((v - d0) / span) * (r1 - r0)
  }
}

/** Time scale over epoch milliseconds; identical maths to a linear scale. */
export const createTimeScale = createLinearScale
