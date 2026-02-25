import type { Context } from 'hono'
import type { AppEnv } from '../../../../lib/app-env'
import { analyticsProvider } from '../../../../providers'

let cachedScript: { content: string; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export const analyticsScriptHandler = async (c: Context<AppEnv>) => {
  if (!analyticsProvider) {
    return c.text('Not Found', 404)
  }

  // NOTE(es3n1n): a race here is negligible
  const now = Date.now()
  if (cachedScript && now - cachedScript.fetchedAt < CACHE_TTL_MS) {
    return c.body(cachedScript.content, 200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
    })
  }

  try {
    const resp = await fetch(analyticsProvider.getScriptUrl())
    if (!resp.ok) {
      return c.text('Failed to fetch analytics script', 502)
    }

    const content = await resp.text()
    cachedScript = { content, fetchedAt: now }

    return c.body(content, 200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
    })
  } catch {
    return c.text('Failed to fetch analytics script', 502)
  }
}
