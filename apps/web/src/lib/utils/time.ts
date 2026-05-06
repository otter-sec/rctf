import { format, intervalToDuration } from 'date-fns'

function formatTime(diff: number): string {
  const {
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0,
  } = intervalToDuration({
    start: 0,
    end: diff,
  })

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (parts.length === 0) parts.push(`${seconds}s`)

  return parts.join(', ')
}

export function formatFirstBloodTime(
  timestamp: number,
  ctfStartTime: number
): string {
  return formatTime(timestamp - ctfStartTime)
}

export function formatRelativeToFirstBlood(
  timestamp: number,
  firstBloodTime: number
): string {
  if (!firstBloodTime) {
    return ''
  }
  return `+${formatTime(timestamp - firstBloodTime)}`
}

export function formatLocalTime(timestamp: number): string {
  return format(timestamp, 'MMM d, h:mm a')
}

export function formatDatetimeLocalValue(
  timestamp: number | null | undefined
): string {
  if (timestamp === null || timestamp === undefined) {
    return ''
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function parseDatetimeLocalValue(value: string): number | null {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function formatRelativeHours(
  timestamp: number,
  startTime: number
): string {
  const hours = Math.round((timestamp - startTime) / 3_600_000)
  return hours === 0 ? '0h' : `+${hours}h`
}

export function formatRelativeHoursMinutes(
  timestamp: number,
  startTime: number
): string {
  const totalMinutes = (timestamp - startTime) / 60_000
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)

  if (hours === 0 && minutes === 0) return '0h'
  if (minutes === 0) return `+${hours}h`
  return `+${hours}h ${minutes}m`
}

export function formatCountdown(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
