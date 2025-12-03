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

export function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]
  return `${n}${suffix}`
}

export function formatLocalTime(timestamp: number): string {
  return format(timestamp, 'MMM d, h:mm a')
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
