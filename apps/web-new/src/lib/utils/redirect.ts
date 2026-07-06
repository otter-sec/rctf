export function getRedirectPath(next: string | null, origin: string): string {
  if (!next?.startsWith('/')) return '/'

  try {
    const url = new URL(next, origin)
    const path = `${url.pathname}${url.search}${url.hash}`
    return url.origin === origin && !path.startsWith('//') ? path : '/'
  } catch {
    return '/'
  }
}
