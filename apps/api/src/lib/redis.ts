import Redis from 'ioredis'
import { config } from '../config'

let client: Redis | null | undefined

const connectRedis = async (): Promise<Redis | null> => {
  if (!config.database.redis) {
    return null
  }

  let redis: Redis

  if (typeof config.database.redis == 'string') {
    redis = new Redis(config.database.redis)
  } else {
    redis = new Redis({
      host: config.database.redis.host,
      port: config.database.redis.port,
      password: config.database.redis.password,
      db: config.database.redis.database,
    })
  }

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
