export type Duration = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

// like date-fns', but it keeps the whole span in days instead of rolling 30+
// days into a `months` field we never render
export function intervalToDuration(ms: number): Duration {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  }
}

// deliberately not Intl.DurationFormat (Baseline 2025, newly available): en
// narrow renders '2d 3h 4m' -- no commas -- and '' when the span is zero
function formatDuration(ms: number): string {
  const { days, hours, minutes, seconds } = intervalToDuration(ms)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  return parts.length > 0 ? parts.join(', ') : `${seconds}s`
}

export function formatFirstBloodTime(
  timestamp: number,
  ctfStartTime: number
): string {
  return formatDuration(timestamp - ctfStartTime)
}

export function formatRelativeToFirstBlood(
  timestamp: number,
  firstBloodTime: number
): string {
  if (!firstBloodTime) {
    return ''
  }
  return `+${formatDuration(timestamp - firstBloodTime)}`
}

export function formatCtfOffset(
  timestamp: number,
  startTime: number | null | undefined
): string {
  if (startTime === null || startTime === undefined) return ''

  const diff = timestamp - startTime
  return `T${diff < 0 ? '-' : '+'}${formatDuration(Math.abs(diff))}`
}

const localTimeFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h12',
})

// values from Intl, glue hand-joined: `.format()` is not byte-stable across
// engines ('Jun 5, 3:42 PM' on V8 vs 'Jun 5 at 3:42 PM' on JSC), and this
// must keep matching the old date-fns format 'MMM d, h:mm a' exactly
export function formatLocalTime(timestamp: number): string {
  const parts = new Map(
    localTimeFormat.formatToParts(timestamp).map(p => [p.type, p.value])
  )
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.get(type) ?? ''
  return `${get('month')} ${get('day')}, ${get('hour')}:${get('minute')} ${get('dayPeriod')}`
}

function formatOffsetMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0 && minutes === 0) return '0h'
  if (minutes === 0) return `+${hours}h`
  return `+${hours}h ${minutes}m`
}

// nearest hour: graph axis ticks when zoomed out
export function formatRelativeHours(
  timestamp: number,
  startTime: number
): string {
  return formatOffsetMinutes(
    Math.round((timestamp - startTime) / 3_600_000) * 60
  )
}

// nearest minute: graph tooltips and zoomed-in axis ticks
export function formatRelativeHoursMinutes(
  timestamp: number,
  startTime: number
): string {
  return formatOffsetMinutes(Math.round((timestamp - startTime) / 60_000))
}

// minutes deliberately unbounded ('62:00'): Intl digital style would roll
// hours ('1:02:00') and two-digit-pad minutes ('04:05')
export function formatCountdown(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 24-hour HH:MM:SS in local time for admin-bot log line stamps. Built from Date
// parts rather than Intl so it stays byte-stable and never rolls to a 12-hour
// clock across engines/locales.
export function formatClockTime(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
