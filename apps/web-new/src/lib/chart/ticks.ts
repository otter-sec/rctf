import {
  formatRelativeHours,
  formatRelativeHoursMinutes,
} from '$lib/utils/time'

export interface Tick {
  value: number
  label: string
}

const MINUTE_LABEL_THRESHOLD_MS = 7 * 60 * 60 * 1000

export function ctfRelativeTicks(
  startMs: number,
  endMs: number,
  count = 7
): Tick[] {
  if (count < 1) return []

  const span = endMs - startMs
  const format =
    span < MINUTE_LABEL_THRESHOLD_MS
      ? formatRelativeHoursMinutes
      : formatRelativeHours

  if (count === 1) {
    return [{ value: startMs, label: format(startMs, startMs) }]
  }

  const step = span / (count - 1)
  const ticks: Tick[] = []
  for (let i = 0; i < count; i++) {
    const value = i === count - 1 ? endMs : startMs + step * i
    ticks.push({ value, label: format(value, startMs) })
  }
  return ticks
}
