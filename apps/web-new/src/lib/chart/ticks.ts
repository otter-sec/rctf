import {
  formatRelativeHours,
  formatRelativeHoursMinutes,
} from '$lib/utils/time'

/**
 * CTF-relative axis ticks: evenly spaced marks anchored to the CTF window with
 * labels expressed as an offset from the start time. Ports the old graph's
 * X_AXIS_DIVISIONS=6 (7 ticks) behaviour without pulling in a charting library.
 */

export interface Tick {
  value: number
  label: string
}

// Below a 7h span the old app switched to minute-precision labels; at or above
// it, labels round to whole hours (formatRelativeHours vs -HoursMinutes).
const MINUTE_LABEL_THRESHOLD_MS = 7 * 60 * 60 * 1000

/**
 * Returns exactly `count` ticks between `startMs` and `endMs` inclusive, with
 * the first anchored to `startMs` and the last to `endMs` (no floating-point
 * drift on the endpoints).
 */
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
    const value =
      i === 0 ? startMs : i === count - 1 ? endMs : startMs + step * i
    ticks.push({ value, label: format(value, startMs) })
  }
  return ticks
}
