import { formatCtfOffset, formatLocalTime } from '$lib/utils/time'
import { resolveTimeRangeFilter, type TimeRangeFilter } from './time'

/**
 * Human-readable label for a time-range chip: `X to Y` when both endpoints are
 * set, `After X` / `Before Y` for a single bound, and `Invalid time range` when
 * the filter cannot resolve. Absolute endpoints render as local times; relative
 * endpoints render as CTF offsets (`T+2h`).
 */
export function formatTimeRangeSummary(
  filter: TimeRangeFilter,
  ctfStartTime: number | null | undefined
): string {
  const resolution = resolveTimeRangeFilter(filter, ctfStartTime)
  if (resolution.error) return 'Invalid time range'

  const startLabel =
    filter.mode === 'relative'
      ? relativeEndpoint(resolution.createdAfter, ctfStartTime)
      : absoluteEndpoint(filter.start)
  const endLabel =
    filter.mode === 'relative'
      ? relativeEndpoint(resolution.createdBefore, ctfStartTime)
      : absoluteEndpoint(filter.end)

  if (startLabel && endLabel) return `${startLabel} to ${endLabel}`
  if (startLabel) return `After ${startLabel}`
  if (endLabel) return `Before ${endLabel}`
  return ''
}

// A resolved filter has no error, so a non-empty absolute value already parsed.
function absoluteEndpoint(value: string): string {
  if (!value.trim()) return ''
  return formatLocalTime(new Date(value).getTime())
}

function relativeEndpoint(
  iso: string | undefined,
  ctfStartTime: number | null | undefined
): string {
  if (!iso) return ''
  return formatCtfOffset(new Date(iso).getTime(), ctfStartTime)
}
