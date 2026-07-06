export interface LinearTicks {
  max: number
  values: number[]
}

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
