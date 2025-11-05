// TODO(es3n1n): rewrite the entire thing
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { ServerConfig } from '@rctf/types'
import deepMerge from 'deepmerge'
import type { PartialDeep } from 'type-fest'
import yaml from 'yaml'
import { z } from 'zod'

const CONFIG_DIRECTORY_NAME = 'rctf.d'
const DEFAULT_SEARCH_ROOT = path.resolve(__dirname, '../../')

type ConfigLayer = PartialDeep<ServerConfig>
type ConfigFileLoader = (raw: string) => ConfigLayer

const SUPPORTED_CONFIG_EXTENSIONS = ['json', 'yaml', 'yml'] as const
const ConfigExtensionSchema = z.enum(SUPPORTED_CONFIG_EXTENSIONS)
type ConfigExtension = z.infer<typeof ConfigExtensionSchema>

const TRUTHY_ENV_VALUES = new Set(['true', 'yes', 'y', '1'])

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const pruneValue = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return undefined
  }

  if (Array.isArray(value)) {
    const prunedArray = value
      .map(pruneValue)
      .filter((item): item is unknown => item !== undefined)
    return prunedArray.length > 0 ? prunedArray : undefined
  }

  if (isPlainObject(value)) {
    const prunedObject = Object.entries(value).reduce((acc, [key, current]) => {
      const pruned = pruneValue(current)
      if (pruned !== undefined) {
        acc[key] = pruned
      }
      return acc
    }, {} as Record<string, unknown>)

    return Object.keys(prunedObject).length > 0 ? prunedObject : undefined
  }

  return value
}

export const removeUndefined = <T extends Record<string, unknown>>(
  input: T
): T => {
  const pruned = pruneValue(input) as Record<string, unknown> | undefined
  return (pruned ?? {}) as T
}

const booleanStringSchema = z
  .string()
  .transform(value => TRUTHY_ENV_VALUES.has(value.trim().toLowerCase()))

const booleanSchema = z.union([z.boolean(), booleanStringSchema])
const integerSchema = z.coerce.number().int()
const stringSchema = z.string()

export const parseBoolEnv = (val: string): boolean =>
  booleanStringSchema.parse(val)

export const makeNullsafe =
  <Arg, Ret>(
    f: (value: Arg) => Ret
  ): ((value: Arg | undefined) => Ret | undefined) =>
  value =>
    value === undefined ? undefined : f(value)

const parseInteger = (value: string): number => Number.parseInt(value, 10)

export const nullsafeParseInt = makeNullsafe(parseInteger)
export const nullsafeParseBoolEnv = makeNullsafe(parseBoolEnv)

const loadJson: ConfigFileLoader = raw => JSON.parse(raw)
const loadYaml: ConfigFileLoader = raw => yaml.parse(raw)

const FILE_LOADERS: Record<ConfigExtension, ConfigFileLoader> = {
  json: loadJson,
  yaml: loadYaml,
  yml: loadYaml,
}

const resolveLoader = (filePath: string): ConfigFileLoader | undefined => {
  const extensionResult = ConfigExtensionSchema.safeParse(
    path.extname(filePath).slice(1).toLowerCase()
  )

  return extensionResult.success
    ? FILE_LOADERS[extensionResult.data]
    : undefined
}

const readTextFile = (filePath: string): string =>
  readFileSync(filePath, { encoding: 'utf8' })

const parseOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  const parsed = stringSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

const parseOptionalInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }

  const parsed = integerSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

const parseOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  const parsed = booleanSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export const loadFile = (filePath: string): ConfigLayer | undefined => {
  const loader = resolveLoader(filePath)
  if (!loader) {
    return undefined
  }

  return loader(readTextFile(filePath))
}

export const findConfigDir = (start: string = DEFAULT_SEARCH_ROOT): string => {
  for (let current = path.resolve(start); true; ) {
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

  const files = readdirSync(absolute, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map(fileName => path.join(absolute, fileName))

  return files
    .map(loadFile)
    .filter((config): config is ConfigLayer => config !== undefined)
}

export const loadEnvConfig = (): ConfigLayer => {
  const env = process.env

  const getString = (key: keyof NodeJS.ProcessEnv) =>
    parseOptionalString(env[key])
  const getInteger = (key: keyof NodeJS.ProcessEnv) =>
    parseOptionalInteger(env[key])
  const getBoolean = (key: keyof NodeJS.ProcessEnv) =>
    parseOptionalBoolean(env[key])

  const sqlConfig =
    getString('RCTF_DATABASE_URL') ??
    removeUndefined({
      host: getString('RCTF_DATABASE_HOST'),
      port: getInteger('RCTF_DATABASE_PORT'),
      user: getString('RCTF_DATABASE_USERNAME'),
      password: getString('RCTF_DATABASE_PASSWORD'),
      database: getString('RCTF_DATABASE_DATABASE'),
    })

  const redisConfig =
    getString('RCTF_REDIS_URL') ??
    removeUndefined({
      host: getString('RCTF_REDIS_HOST'),
      port: getInteger('RCTF_REDIS_PORT'),
      password: getString('RCTF_REDIS_PASSWORD'),
      database: getInteger('RCTF_REDIS_DATABASE'),
    })

  return removeUndefined({
    database: removeUndefined({
      sql: sqlConfig,
      redis: redisConfig,
      migrate: getString('RCTF_DATABASE_MIGRATE'),
    }),
    instanceType: getString('RCTF_INSTANCE_TYPE'),
    tokenKey: getString('RCTF_TOKEN_KEY'),
    origin: getString('RCTF_ORIGIN'),
    ctftime: removeUndefined({
      clientId: getString('RCTF_CTFTIME_CLIENT_ID'),
      clientSecret: getString('RCTF_CTFTIME_CLIENT_SECRET'),
    }),
    userMembers: getBoolean('RCTF_USER_MEMBERS'),
    homeContent: getString('RCTF_HOME_CONTENT'),
    ctfName: getString('RCTF_NAME'),
    meta: removeUndefined({
      description: getString('RCTF_META_DESCRIPTION'),
      imageUrl: getString('RCTF_IMAGE_URL'),
    }),
    faviconUrl: getString('RCTF_FAVICON_URL'),
    globalSiteTag: getString('RCTF_GLOBAL_SITE_TAG'),
    email: removeUndefined({
      from: getString('RCTF_EMAIL_FROM'),
      logoUrl: getString('RCTF_EMAIL_LOGO_URL'),
    }),
    startTime: getInteger('RCTF_START_TIME'),
    endTime: getInteger('RCTF_END_TIME'),
    leaderboard: removeUndefined({
      maxLimit: getInteger('RCTF_LEADERBOARD_MAX_LIMIT'),
      maxOffset: getInteger('RCTF_LEADERBOARD_MAX_OFFSET'),
      updateInterval: getInteger('RCTF_LEADERBOARD_UPDATE_INTERVAL'),
      graphMaxTeams: getInteger('RCTF_LEADERBOARD_GRAPH_MAX_TEAMS'),
      graphSampleTime: getInteger('RCTF_LEADERBOARD_GRAPH_SAMPLE_TIME'),
    }),
    loginTimeout: getInteger('RCTF_LOGIN_TIMEOUT'),
  })
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
}

export const config: ServerConfig = deepMerge.all([
  defaultConfig,
  ...loadFileConfigs(),
  loadEnvConfig(),
]) as ServerConfig
