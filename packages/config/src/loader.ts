import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { PartialDeep } from 'type-fest'
import yaml from 'yaml'
import type { ServerConfig } from './types'

type ConfigLayer = PartialDeep<ServerConfig>

const CONFIG_DIRECTORY_NAME = 'rctf.d'
const DEFAULT_SEARCH_ROOT = path.resolve(__dirname, '../../')

const TRUTHY_ENV_VALUES = new Set(['true', 'yes', 'y', '1'])

const getString = (key: string): string | undefined => process.env[key]
const getInteger = (key: string): number | undefined =>
  process.env[key] ? Number.parseInt(process.env[key].trim()) : undefined
const getBoolean = (key: string): boolean | undefined =>
  process.env[key]
    ? TRUTHY_ENV_VALUES.has(process.env[key].trim().toLowerCase())
    : undefined

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
  const databaseUrl = getString('RCTF_DATABASE_URL')
  const databaseMigrate = getString('RCTF_DATABASE_MIGRATE')
  const sqlDetails = optionalObjectFrom([
    ['host', getString('RCTF_DATABASE_HOST')],
    ['port', getInteger('RCTF_DATABASE_PORT')],
    ['user', getString('RCTF_DATABASE_USERNAME')],
    ['password', getString('RCTF_DATABASE_PASSWORD')],
    ['database', getString('RCTF_DATABASE_DATABASE')],
  ])

  const redisUrl = getString('RCTF_REDIS_URL')
  const redisDetails = optionalObjectFrom([
    ['host', getString('RCTF_REDIS_HOST')],
    ['port', getInteger('RCTF_REDIS_PORT')],
    ['password', getString('RCTF_REDIS_PASSWORD')],
    ['database', getInteger('RCTF_REDIS_DATABASE')],
  ])

  const ctftime = optionalObjectFrom([
    ['clientId', getString('RCTF_CTFTIME_CLIENT_ID')],
    ['clientSecret', getString('RCTF_CTFTIME_CLIENT_SECRET')],
  ])

  const discord = optionalObjectFrom([
    ['clientId', getString('RCTF_DISCORD_CLIENT_ID')],
    ['clientSecret', getString('RCTF_DISCORD_CLIENT_SECRET')],
  ])

  const meta = optionalObjectFrom([
    ['description', getString('RCTF_META_DESCRIPTION')],
    ['imageUrl', getString('RCTF_IMAGE_URL')],
  ])

  const email = optionalObjectFrom([
    ['from', getString('RCTF_EMAIL_FROM')],
    ['logoUrl', getString('RCTF_EMAIL_LOGO_URL')],
  ])

  const leaderboard = optionalObjectFrom([
    ['maxLimit', getInteger('RCTF_LEADERBOARD_MAX_LIMIT')],
    ['maxOffset', getInteger('RCTF_LEADERBOARD_MAX_OFFSET')],
    ['updateInterval', getInteger('RCTF_LEADERBOARD_UPDATE_INTERVAL')],
    ['graphMaxTeams', getInteger('RCTF_LEADERBOARD_GRAPH_MAX_TEAMS')],
    ['graphSampleTime', getInteger('RCTF_LEADERBOARD_GRAPH_SAMPLE_TIME')],
  ])

  const database = optionalObjectFrom([
    ['sql', databaseUrl ?? sqlDetails],
    ['redis', redisUrl ?? redisDetails],
    ['migrate', databaseMigrate],
  ])

  return (optionalObjectFrom([
    ['database', database],
    ['instanceType', getString('RCTF_INSTANCE_TYPE')],
    ['tokenKey', getString('RCTF_TOKEN_KEY')],
    ['origin', getString('RCTF_ORIGIN')],
    ['ctftime', ctftime],
    ['discord', discord],
    ['userMembers', getBoolean('RCTF_USER_MEMBERS')],
    ['homeContent', getString('RCTF_HOME_CONTENT')],
    ['ctfName', getString('RCTF_NAME')],
    ['meta', meta],
    ['faviconUrl', getString('RCTF_FAVICON_URL')],
    ['globalSiteTag', getString('RCTF_GLOBAL_SITE_TAG')],
    ['email', email],
    ['startTime', getInteger('RCTF_START_TIME')],
    ['endTime', getInteger('RCTF_END_TIME')],
    ['leaderboard', leaderboard],
    ['loginTimeout', getInteger('RCTF_LOGIN_TIMEOUT')],
  ]) || {}) as ConfigLayer
}

export const defaultConfig: PartialDeep<ServerConfig> = {
  database: {
    migrate: 'never',
  },
  instanceType: 'all',
  userMembers: true,
  registrationsEnabled: true,
  sponsors: [],
  homeContent: '',
  faviconUrl: 'https://redpwn.storage.googleapis.com/branding/rctf-favicon.ico',
  challengeProvider: {
    name: 'challenges/database',
  },
  uploadProvider: {
    name: 'uploads/local',
  },
  maxAvatarSize: 1024 * 1024 * 1, // 1MB
  proxy: {
    cloudflare: false,
    trust: false,
  },
  meta: {
    description: '',
    imageUrl: '',
  },
  leaderboard: {
    maxLimit: 100,
    maxOffset: 4294967296,
    updateInterval: 10000,
    graphMaxTeams: 10,
    graphSampleTime: 1800000,
  },
  loginTimeout: 3600000,
  scoreProvider: {
    name: 'scores/classic',
  },
}
