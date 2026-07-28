export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export const normalizePath = (pathname: string) => {
  try {
    return decodeURIComponent(pathname).replace(/\/+$/, '')
  } catch {
    return pathname.replace(/\/+$/, '')
  }
}

export const hashId = (hash: string) => decodeURIComponent(hash.slice(1))
