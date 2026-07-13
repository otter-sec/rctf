export type TimeRangeMode = 'absolute' | 'relative'

export type TimeRangeFilter = {
  mode: TimeRangeMode
  start: string
  end: string
  relativeStart: string
  relativeEnd: string
}

export type TimeRangeResolution = {
  createdAfter?: string
  createdBefore?: string
  error?: string
}

export function createTimeRangeFilter(): TimeRangeFilter {
  return {
    mode: 'absolute',
    start: '',
    end: '',
    relativeStart: '',
    relativeEnd: '',
  }
}

export function clearTimeRangeFilter(filter: TimeRangeFilter) {
  filter.mode = 'absolute'
  filter.start = ''
  filter.end = ''
  filter.relativeStart = ''
  filter.relativeEnd = ''
}

export function hasTimeRangeFilter(filter: TimeRangeFilter) {
  return activeTimeRangeValues(filter).some(value => value.trim() !== '')
}

export function resolveTimeRangeFilter(
  filter: TimeRangeFilter,
  ctfStartTime?: number | null
): TimeRangeResolution {
  const [fromValue, toValue] = activeTimeRangeValues(filter)

  if (!fromValue.trim() && !toValue.trim()) return {}
  if (
    filter.mode === 'relative' &&
    (ctfStartTime === null || ctfStartTime === undefined)
  ) {
    return { error: 'CTF start time is unavailable.' }
  }

  const createdAfter =
    filter.mode === 'relative'
      ? relativeOffsetToIso(fromValue, ctfStartTime)
      : localDateTimeToIso(fromValue)
  const createdBefore =
    filter.mode === 'relative'
      ? relativeOffsetToIso(toValue, ctfStartTime)
      : localDateTimeToIso(toValue)

  if (fromValue.trim() && !createdAfter) {
    return {
      error:
        filter.mode === 'relative'
          ? 'Enter a valid relative start time.'
          : 'Enter a valid start time.',
    }
  }
  if (toValue.trim() && !createdBefore) {
    return {
      error:
        filter.mode === 'relative'
          ? 'Enter a valid relative end time.'
          : 'Enter a valid end time.',
    }
  }
  if (createdAfter && createdBefore && createdAfter > createdBefore) {
    return { error: 'Start must happen before end.' }
  }

  return {
    createdAfter,
    createdBefore,
  }
}

export function timeRangeFingerprint(filter: TimeRangeFilter) {
  return [
    filter.mode,
    filter.start.trim(),
    filter.end.trim(),
    filter.relativeStart.trim(),
    filter.relativeEnd.trim(),
  ].join(':')
}

function activeTimeRangeValues(filter: TimeRangeFilter): [string, string] {
  return filter.mode === 'relative'
    ? [filter.relativeStart, filter.relativeEnd]
    : [filter.start, filter.end]
}

function localDateTimeToIso(value: string) {
  if (!value.trim()) return undefined

  const time = new Date(value).getTime()
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined
}

function relativeOffsetToIso(value: string, ctfStartTime?: number | null) {
  if (!value.trim()) return undefined
  if (ctfStartTime === null || ctfStartTime === undefined) return undefined

  const offset = parseRelativeOffset(value)
  return offset === undefined
    ? undefined
    : new Date(ctfStartTime + offset).toISOString()
}

export function parseRelativeOffset(value: string): number | undefined {
  let input = value.trim().toLowerCase().replace(/^t\s*/, '').replace(/,/g, ' ')
  let sign = 1

  if (input.startsWith('-')) {
    sign = -1
    input = input.slice(1).trim()
  } else if (input.startsWith('+')) {
    input = input.slice(1).trim()
  }

  if (/^\d+(?:\.\d+)?$/.test(input)) {
    return sign * Number(input) * 60_000
  }

  const units: Record<string, number> = {
    d: 86_400_000,
    day: 86_400_000,
    days: 86_400_000,
    h: 3_600_000,
    hr: 3_600_000,
    hrs: 3_600_000,
    hour: 3_600_000,
    hours: 3_600_000,
    m: 60_000,
    min: 60_000,
    mins: 60_000,
    minute: 60_000,
    minutes: 60_000,
    s: 1_000,
    sec: 1_000,
    secs: 1_000,
    second: 1_000,
    seconds: 1_000,
  }
  const matches = [...input.matchAll(/(\d+(?:\.\d+)?)\s*([a-z]+)/g)]
  const remaining = matches
    .reduce((current, match) => current.replace(match[0], ' '), input)
    .trim()

  if (!matches.length || remaining) {
    return undefined
  }

  let total = 0
  for (const match of matches) {
    const amount = Number(match[1])
    const unit = units[match[2]!]
    if (!Number.isFinite(amount) || unit === undefined) return undefined
    total += amount * unit
  }

  return sign * total
}
