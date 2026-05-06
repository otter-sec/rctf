import type { ServerConfig } from '../../packages/config/src/types'

const localHosts = new Set(['127.0.0.1', 'localhost'])

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

const parseUrl = (value: string, label: string) => {
  try {
    return new URL(value)
  } catch {
    failDevStorageTarget(`${label} URL must be valid`)
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
      port !== 55432 ||
      decodeUrlPart(url.username) !== 'rctf' ||
      decodeUrlPart(url.password) !== 'DO_NOT_USE_ME' ||
      url.pathname !== '/rctf'
    ) {
      failDevStorageTarget(
        'SQL URL must target the local dev Postgres at 127.0.0.1:55432/rctf'
      )
    }

    return
  }

  if (
    !localHosts.has(sql.host) ||
    sql.port !== 55432 ||
    sql.user !== 'rctf' ||
    sql.password !== 'DO_NOT_USE_ME' ||
    sql.database !== 'rctf'
  ) {
    failDevStorageTarget(
      'SQL config must target the local dev Postgres at 127.0.0.1:55432/rctf'
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
      port !== 56379 ||
      decodeUrlPart(url.password) !== 'DO_NOT_USE_ME' ||
      !['', '0'].includes(db)
    ) {
      failDevStorageTarget(
        'Redis URL must target the local dev Redis at 127.0.0.1:56379'
      )
    }

    return
  }

  if (
    !localHosts.has(redis.host) ||
    redis.port !== 56379 ||
    redis.password !== 'DO_NOT_USE_ME' ||
    ![undefined, 0].includes(redis.database)
  ) {
    failDevStorageTarget(
      'Redis config must target the local dev Redis at 127.0.0.1:56379'
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
