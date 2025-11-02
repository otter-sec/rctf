import { HTTPException } from 'hono/http-exception'
import type { MiddlewareHandler } from 'hono'

interface RateLimitOptions {
  limit: number
  windowMs: number
  keyGenerator?: (
    context: Parameters<MiddlewareHandler>[0]
  ) => string | Promise<string>
  message?: string
}

type TimestampStore = {
  timestamps: number[]
}

const stores = new Map<string, TimestampStore>()

const defaultKeyGenerator = (c: Parameters<MiddlewareHandler>[0]): string => {
  const forwarded =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')
  if (forwarded) {
    const [first] = forwarded.split(',')
    if (first) return first.trim()
  }
  return c.req.header('x-real-ip') ?? 'anonymous'
}

export const rateLimit = (options: RateLimitOptions): MiddlewareHandler => {
  const {
    limit,
    windowMs,
    keyGenerator = defaultKeyGenerator,
    message,
  } = options

  if (limit <= 0) {
    throw new Error('rateLimit: limit must be greater than 0')
  }
  if (windowMs <= 0) {
    throw new Error('rateLimit: windowMs must be greater than 0')
  }

  return async (c, next) => {
    const key = await keyGenerator(c)
    const now = Date.now()
    const cutoff = now - windowMs

    const store = stores.get(key) ?? { timestamps: [] }

    store.timestamps = store.timestamps.filter(ts => ts > cutoff)

    if (store.timestamps.length >= limit) {
      throw new HTTPException(429, {
        message: message ?? 'Too many requests, please slow down.',
      })
    }

    store.timestamps.push(now)
    stores.set(key, store)

    try {
      await next()
    } finally {
      // drop timestamps older than cutoff after request completes to keep array small
      store.timestamps = store.timestamps.filter(ts => ts > cutoff)
      if (store.timestamps.length === 0) {
        stores.delete(key)
      } else {
        stores.set(key, store)
      }
    }
  }
}

export const resetRateLimitStores = (): void => {
  stores.clear()
}
