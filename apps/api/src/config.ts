const parseInteger = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const parseOptionalInteger = (value: string | undefined): number | null => {
  if (!value) {
    return null
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const requireEnv = (value: string | undefined, message: string): string => {
  if (!value) {
    throw new Error(message)
  }
  return value
}

export interface AppConfig {
  server: {
    port: number
  }
  auth: {
    tokenKey: string
    loginTimeoutSeconds: number
  }
  database: {
    url: string
  }
  redis: {
    url: string | null
  }
  schedule: {
    startTime: number | null
    endTime: number | null
  }
}

const rawTokenKey = requireEnv(
  process.env.RCTF_TOKEN_KEY,
  'RCTF_TOKEN_KEY (base64-encoded 32-byte secret) must be provided via environment'
)

const tokenKeyBytes = Buffer.from(rawTokenKey, 'base64')

if (tokenKeyBytes.byteLength !== 32) {
  throw new Error('TOKEN_KEY must decode to exactly 32 bytes')
}

const databaseUrl = requireEnv(
  process.env.RCTF_DATABASE_URL,
  'RCTF_DATABASE_URL is required for database access. Provide a Postgres connection string.'
)

const config: AppConfig = {
  server: {
    port: parseInteger(process.env.RCTF_PORT, 3000),
  },
  auth: {
    tokenKey: rawTokenKey,
    loginTimeoutSeconds: parseInteger(process.env.RCTF_LOGIN_TIMEOUT, 3600),
  },
  database: {
    url: databaseUrl,
  },
  redis: {
    url: process.env.RCTF_REDIS_URL ?? null,
  },
  schedule: {
    startTime: parseOptionalInteger(process.env.RCTF_START_TIME),
    endTime: parseOptionalInteger(process.env.RCTF_END_TIME),
  },
}

export { config }
