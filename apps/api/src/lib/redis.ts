import Redis from 'ioredis'
import { config } from '../config'

let client: Redis | null | undefined

const connectRedis = async (): Promise<Redis | null> => {
  if (!config.redis.url) {
    return null
  }

  const redis = new Redis(config.redis.url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })

  redis.on('error', error => {
    console.error('[redis] connection error', error)
  })

  try {
    await redis.connect()
    return redis
  } catch (error) {
    console.error('[redis] failed to connect', error)
    await redis.quit().catch(() => {
      /* ignore */
    })
    return null
  }
}

export const getRedisClient = async (): Promise<Redis | null> => {
  if (client !== undefined) {
    return client
  }

  client = await connectRedis()
  return client
}

export const closeRedisClient = async (): Promise<void> => {
  if (client) {
    await client.quit().catch(() => {
      /* ignore */
    })
  }
  client = null
}
