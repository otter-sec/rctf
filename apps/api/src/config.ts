const parseInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const tokenKey =
  process.env.RCTF_TOKEN_KEY ?? process.env.TOKEN_KEY ?? undefined

if (!tokenKey) {
  throw new Error(
    'TOKEN_KEY (base64-encoded 32-byte secret) must be provided via environment'
  )
}

const tokenKeyBytes = Buffer.from(tokenKey, 'base64')

if (tokenKeyBytes.byteLength !== 32) {
  throw new Error('TOKEN_KEY must decode to exactly 32 bytes')
}

const port = parseInteger(process.env.PORT, 3000)

const loginTimeoutSeconds = parseInteger(
  process.env.LOGIN_TIMEOUT ?? process.env.RCTF_LOGIN_TIMEOUT,
  3600
)

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.RCTF_DATABASE_URL ?? undefined

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required for database access. Provide a Postgres connection string.'
  )
}

const redisUrl =
  process.env.REDIS_URL ?? process.env.RCTF_REDIS_URL ?? undefined

export const config = {
  port,
  loginTimeoutSeconds,
  tokenKey,
  databaseUrl,
  redisUrl,
}

export type AppConfig = typeof config
