export type Duration = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function intervalToDuration(ms: number): Duration {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  }
}

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

export function formatRelativeHours(
  timestamp: number,
  startTime: number
): string {
  return formatOffsetMinutes(
    Math.round((timestamp - startTime) / 3_600_000) * 60
  )
}

export function formatRelativeHoursMinutes(
  timestamp: number,
  startTime: number
): string {
  return formatOffsetMinutes(Math.round((timestamp - startTime) / 60_000))
}

export function formatCountdown(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatClockTime(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
