import { format } from 'date-fns'

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

function formatTime(diff: number): string {
  const { days, hours, minutes, seconds } = intervalToDuration(diff)

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

export function formatCtfOffset(
  timestamp: number,
  startTime: number | null | undefined
): string {
  if (startTime === null || startTime === undefined) return ''

  const diff = timestamp - startTime
  return `T${diff < 0 ? '-' : '+'}${formatTime(Math.abs(diff))}`
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
  const totalMinutes = Math.round((timestamp - startTime) / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0 && minutes === 0) return '0h'
  if (minutes === 0) return `+${hours}h`
  return `+${hours}h ${minutes}m`
}

export function formatCountdown(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  const secs = Math.floor((ms % 60_000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
