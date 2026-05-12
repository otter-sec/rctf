export type NumericScale = {
  domain: () => number[]
}

const defaultAxisDivisions = 4

export function axisTicks(
  scale: NumericScale,
  divisions = defaultAxisDivisions
): number[] {
  const [min, max] = scale.domain()
  if (min === undefined || max === undefined) return []
  if (min === max) return [min]

  const step = (max - min) / divisions
  return Array.from({ length: divisions + 1 }, (_, index) => min + step * index)
}

export function integerTicks(
  scale: NumericScale,
  divisions = defaultAxisDivisions
): number[] {
  const [min, max] = scale.domain()
  if (min === undefined || max === undefined) return []
  if (min === max) return [Math.round(min)]

  const start = Math.ceil(min)
  const end = Math.floor(max)
  if (end < start) return [Math.round(min)]

  if (end - start <= divisions + 2) {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }

  const step = Math.max(1, Math.ceil((end - start) / divisions))
  const ticks: number[] = []
  for (let value = start; value <= end; value += step) {
    ticks.push(value)
  }

  if (ticks.at(-1) !== end) ticks.push(end)
  return ticks
}

export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) < 1000) return Math.round(value).toLocaleString()

  const rounded = Math.round((value / 1000) * 10) / 10
  return `${rounded.toLocaleString()}k`
}

export function tickTextAnchor(
  index: number,
  divisions = defaultAxisDivisions
): 'start' | 'middle' | 'end' {
  if (index === 0) return 'start'
  if (index === divisions) return 'end'
  return 'middle'
}
