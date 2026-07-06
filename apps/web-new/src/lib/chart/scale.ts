export type ScaleFn = (value: number) => number

export interface ScaleOptions {
  clamp?: boolean
}

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

export const createTimeScale = createLinearScale
