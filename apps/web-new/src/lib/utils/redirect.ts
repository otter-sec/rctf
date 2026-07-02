// `?next` targets are attacker-controlled (open-redirect CVE in the old app):
// same-origin paths only. The `//` prefix check is load-bearing — path
// normalization can yield a protocol-relative path from a same-origin URL
// (e.g. '/..//evil.com'), which browsers would resolve off-origin.
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
