/**
 * Nice linear ticks for a value axis, anchored at zero. Pure and DOM-free so it
 * can be unit tested and shared by any consumer (the scoreboard y-axis). Picks a
 * 1/2/5×10ⁿ step so the labels read cleanly and the top tick gives the plot a
 * little headroom above the data max.
 */

export interface LinearTicks {
  /** The rounded-up axis maximum; feed this to the y scale's domain. */
  max: number
  /** Tick values from 0 to `max` inclusive, evenly spaced by the nice step. */
  values: number[]
}

// Rounds a positive value to the nearest 1/2/5×10ⁿ. Rounding mode picks the
// closest nice number; ceiling mode never returns something smaller.
function niceNum(value: number, round: boolean): number {
  const exp = Math.floor(Math.log10(value))
  const base = 10 ** exp
  const frac = value / base
  let niceFrac: number
  if (round) {
    niceFrac = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10
  } else {
    niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10
  }
  return niceFrac * base
}

export function niceLinearTicks(max: number, count = 4): LinearTicks {
  if (!(max > 0) || !Number.isFinite(max)) {
    return { max: 1, values: [0, 1] }
  }

  const step = niceNum(max / Math.max(1, count), true)
  const niceMax = Math.ceil(max / step) * step

  const values: number[] = []
  for (let value = 0; value <= niceMax + step * 0.5; value += step) {
    values.push(Math.round(value))
  }
  return { max: niceMax, values }
}
