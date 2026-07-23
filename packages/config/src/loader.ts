import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { PartialDeep } from 'type-fest'
import yaml from 'yaml'
import { getEnvBoolean, getEnvInteger, getEnvString } from './env'
import type { ServerConfig } from './types'

type ConfigLayer = PartialDeep<ServerConfig>

const CONFIG_DIRECTORY_NAME = 'rctf.d'
const DEFAULT_SEARCH_ROOT = path.resolve(__dirname, '../../')

const optionalObjectFrom = (entries: Array<[string, unknown | undefined]>) => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of entries) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

const loadFile = (filePath: string): ConfigLayer | undefined => {
  const raw = readFileSync(filePath, { encoding: 'utf8' })
  const ext = path.extname(filePath).slice(1).toLowerCase()

  if (ext === 'json') {
    return JSON.parse(raw)
  }

  if (ext === 'yaml' || ext === 'yml') {
    return yaml.parse(raw)
  }

  return undefined
}

const findConfigDir = (start: string = DEFAULT_SEARCH_ROOT): string => {
  for (let current = path.resolve(start); ; ) {
    const candidate = path.join(current, CONFIG_DIRECTORY_NAME)
    if (existsSync(candidate)) {
      return candidate
    }

    const parent = path.dirname(current)
    if (parent === current) {
      break
    }

    current = parent
  }

  throw new Error('Could not infer a config directory')
}

export const loadFileConfigs = (configPath?: string): ConfigLayer[] => {
  const basePath = configPath ?? process.env.RCTF_CONF_PATH ?? findConfigDir()
  const absolute = path.resolve(basePath)

  return readdirSync(absolute, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(absolute, entry.name))
    .sort((a, b) => a.localeCompare(b))
    .map(loadFile)
    .filter((config): config is ConfigLayer => config !== undefined)
}

export const loadEnvConfig = (): ConfigLayer => {
  const databaseUrl = getEnvString('RCTF_DATABASE_URL')
  const databaseMigrate = getEnvString('RCTF_DATABASE_MIGRATE')
  const sqlDetails = optionalObjectFrom([
    ['host', getEnvString('RCTF_DATABASE_HOST')],
    ['port', getEnvInteger('RCTF_DATABASE_PORT')],
    ['user', getEnvString('RCTF_DATABASE_USERNAME')],
    ['password', getEnvString('RCTF_DATABASE_PASSWORD')],
    ['database', getEnvString('RCTF_DATABASE_DATABASE')],
  ])

  const redisUrl = getEnvString('RCTF_REDIS_URL')
  const redisDetails = optionalObjectFrom([
    ['host', getEnvString('RCTF_REDIS_HOST')],
    ['port', getEnvInteger('RCTF_REDIS_PORT')],
    ['password', getEnvString('RCTF_REDIS_PASSWORD')],
    ['database', getEnvInteger('RCTF_REDIS_DATABASE')],
  ])

  const ctftime = optionalObjectFrom([
    ['clientId', getEnvString('RCTF_CTFTIME_CLIENT_ID')],
    ['clientSecret', getEnvString('RCTF_CTFTIME_CLIENT_SECRET')],
  ])

  const meta = optionalObjectFrom([
    ['description', getEnvString('RCTF_META_DESCRIPTION')],
    ['imageUrl', getEnvString('RCTF_IMAGE_URL')],
  ])

  const email = optionalObjectFrom([
    ['from', getEnvString('RCTF_EMAIL_FROM')],
    ['logoUrl', getEnvString('RCTF_EMAIL_LOGO_URL')],
  ])

  const uploadProvider = optionalObjectFrom([
    ['name', getEnvString('RCTF_UPLOAD_PROVIDER')],
  ])

  const leaderboard = optionalObjectFrom([
    ['maxLimit', getEnvInteger('RCTF_LEADERBOARD_MAX_LIMIT')],
    ['maxOffset', getEnvInteger('RCTF_LEADERBOARD_MAX_OFFSET')],
    ['updateInterval', getEnvInteger('RCTF_LEADERBOARD_UPDATE_INTERVAL')],
    ['graphMaxTeams', getEnvInteger('RCTF_LEADERBOARD_GRAPH_MAX_TEAMS')],
    ['graphSampleTime', getEnvInteger('RCTF_LEADERBOARD_GRAPH_SAMPLE_TIME')],
  ])

  const database = optionalObjectFrom([
    ['sql', databaseUrl ?? sqlDetails],
    ['redis', redisUrl ?? redisDetails],
    ['migrate', databaseMigrate],
  ])

  return (optionalObjectFrom([
    ['database', database],
    ['instanceType', getEnvString('RCTF_INSTANCE_TYPE')],
    ['shutdownTimeout', getEnvInteger('RCTF_SHUTDOWN_TIMEOUT')],
    ['idleTimeout', getEnvInteger('RCTF_IDLE_TIMEOUT')],
    ['maxRequestBodySize', getEnvInteger('RCTF_MAX_REQUEST_BODY_SIZE')],
    ['tokenKey', getEnvString('RCTF_TOKEN_KEY')],
    ['origin', getEnvString('RCTF_ORIGIN')],
    ['ctftime', ctftime],
    ['userMembers', getEnvBoolean('RCTF_USER_MEMBERS')],
    ['homeContent', getEnvString('RCTF_HOME_CONTENT')],
    ['ctfName', getEnvString('RCTF_NAME')],
    ['meta', meta],
    ['faviconUrl', getEnvString('RCTF_FAVICON_URL')],
    ['globalSiteTag', getEnvString('RCTF_GLOBAL_SITE_TAG')],
    ['email', email],
    ['startTime', getEnvInteger('RCTF_START_TIME')],
    ['endTime', getEnvInteger('RCTF_END_TIME')],
    ['leaderboard', leaderboard],
    ['loginTimeout', getEnvInteger('RCTF_LOGIN_TIMEOUT')],
    ['uploadProvider', uploadProvider],
  ]) || {}) as ConfigLayer
}
