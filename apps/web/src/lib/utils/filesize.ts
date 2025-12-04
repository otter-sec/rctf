const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes < 0) return 'Unknown size'
  if (bytes === 0) return '0 B'

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1
  )
  const value = bytes / Math.pow(1024, exponent)
  const formatted = value < 10 ? value.toFixed(1) : Math.round(value).toString()

  return `${formatted} ${UNITS[exponent]}`
}
