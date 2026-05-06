import type { ServerConfig } from '../../packages/config/src/types'

const localHosts = new Set(['127.0.0.1', 'localhost'])
const devSqlTarget = {
  host: '127.0.0.1',
  port: 55432,
  user: 'rctf',
  password: 'DO_NOT_USE_ME',
  database: 'rctf',
} as const
const devRedisTarget = {
  host: '127.0.0.1',
  port: 56379,
  password: 'DO_NOT_USE_ME',
  database: 0,
} as const
const devSqlDescription = `${devSqlTarget.host}:${devSqlTarget.port}/${devSqlTarget.database}`
const devRedisDescription = `${devRedisTarget.host}:${devRedisTarget.port}`

const decodeUrlPart = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const failDevStorageTarget = (reason: string): never => {
  throw new Error(`Refusing to use non-dev storage: ${reason}`)
}

const parseUrl = (value: string, label: string): URL => {
  try {
    return new URL(value)
  } catch {
    return failDevStorageTarget(`${label} URL must be valid`)
  }
}

const assertDevSqlTarget = (database: ServerConfig['database']) => {
  const sql = database.sql

  if (typeof sql === 'string') {
    const url = parseUrl(sql, 'SQL')
    const port = url.port === '' ? undefined : Number(url.port)

    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      failDevStorageTarget('SQL URL must be postgres/postgresql')
    }

    if (
      !localHosts.has(url.hostname) ||
      port !== devSqlTarget.port ||
      decodeUrlPart(url.username) !== devSqlTarget.user ||
      decodeUrlPart(url.password) !== devSqlTarget.password ||
      url.pathname !== `/${devSqlTarget.database}`
    ) {
      failDevStorageTarget(
        `SQL URL must target the local dev Postgres at ${devSqlDescription}`
      )
    }

    return
  }

  if (
    !localHosts.has(sql.host) ||
    sql.port !== devSqlTarget.port ||
    sql.user !== devSqlTarget.user ||
    sql.password !== devSqlTarget.password ||
    sql.database !== devSqlTarget.database
  ) {
    failDevStorageTarget(
      `SQL config must target the local dev Postgres at ${devSqlDescription}`
    )
  }
}

const assertDevRedisTarget = (database: ServerConfig['database']) => {
  const redis = database.redis

  if (typeof redis === 'string') {
    const url = parseUrl(redis, 'Redis')
    const port = url.port === '' ? undefined : Number(url.port)
    const db = url.pathname.replace(/^\//, '')

    if (url.protocol !== 'redis:') {
      failDevStorageTarget('Redis URL must use the redis protocol')
    }

    if (
      !localHosts.has(url.hostname) ||
      port !== devRedisTarget.port ||
      decodeUrlPart(url.password) !== devRedisTarget.password ||
      !['', String(devRedisTarget.database)].includes(db)
    ) {
      failDevStorageTarget(
        `Redis URL must target the local dev Redis at ${devRedisDescription}`
      )
    }

    return
  }

  if (
    !localHosts.has(redis.host) ||
    redis.port !== devRedisTarget.port ||
    redis.password !== devRedisTarget.password ||
    (redis.database !== undefined && redis.database !== devRedisTarget.database)
  ) {
    failDevStorageTarget(
      `Redis config must target the local dev Redis at ${devRedisDescription}`
    )
  }
}

export const assertDevStorageTarget = (database: ServerConfig['database']) => {
  if (process.env.RCTF_ALLOW_DEV_SEED !== '1') {
    failDevStorageTarget('set RCTF_ALLOW_DEV_SEED=1 or use the dev scripts')
  }

  assertDevSqlTarget(database)
  assertDevRedisTarget(database)
}
