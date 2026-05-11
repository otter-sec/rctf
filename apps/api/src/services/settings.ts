import { config } from '@rctf/config'
import { settings, type DatabaseClient, type EditableSettings } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { eq } from 'drizzle-orm'
import type { TypedRedis } from '../cache/scripts'

const VALUE_ID = 'value-0'
const RESOLVED_SETTINGS_CACHE_KEY = 'settings:resolved'
const RESOLVED_SETTINGS_CACHE_TTL = 60_000

export type SettingsPatch = {
  [K in keyof EditableSettings]?: EditableSettings[K] | null
}

export type ResolvedSettings = ReturnType<typeof resolveSettings>
export type CompetitionTiming = Pick<ResolvedSettings, 'startTime' | 'endTime'>

export async function getSettings(
  db: DatabaseClient
): Promise<EditableSettings> {
  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.id, VALUE_ID))
    .then(takeUnique)
  return row?.data ?? {}
}

export function patchSettings(
  current: EditableSettings,
  patch: SettingsPatch
): EditableSettings {
  const updated: EditableSettings = { ...current }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete updated[key as keyof EditableSettings]
    } else if (value !== undefined) {
      ;(updated as Record<string, unknown>)[key] = value
    }
  }

  return updated
}

export async function updateSettings(
  db: DatabaseClient,
  patch: SettingsPatch,
  redis?: TypedRedis
): Promise<EditableSettings> {
  const current = await getSettings(db)
  const updated = patchSettings(current, patch)

  await db
    .insert(settings)
    .values({ id: VALUE_ID, data: updated })
    .onConflictDoUpdate({
      target: settings.id,
      set: { data: updated },
    })

  if (redis) {
    await setCachedResolvedSettings(redis, resolveSettings(updated))
  }

  return updated
}

export function getConfigDefaults(): EditableSettings {
  return {
    ctfName: config.ctfName,
    homeContent: config.homeContent,
    startTime: config.startTime,
    endTime: config.endTime,
    sponsors: config.sponsors,
    meta: config.meta,
    faviconUrl: config.faviconUrl,
    logoLightUrl: config.logoLightUrl,
    logoDarkUrl: config.logoDarkUrl,
  }
}

export function resolveSettings(overrides: EditableSettings) {
  return {
    ctfName: overrides.ctfName ?? config.ctfName,
    homeContent: overrides.homeContent ?? config.homeContent,
    startTime: overrides.startTime ?? config.startTime,
    endTime: overrides.endTime ?? config.endTime,
    sponsors: overrides.sponsors ?? config.sponsors,
    meta: {
      description: overrides.meta?.description ?? config.meta.description,
      imageUrl: overrides.meta?.imageUrl ?? config.meta.imageUrl,
    },
    faviconUrl: overrides.faviconUrl ?? config.faviconUrl ?? null,
    logoLightUrl: (overrides.logoLightUrl ?? config.logoLightUrl) || null,
    logoDarkUrl: (overrides.logoDarkUrl ?? config.logoDarkUrl) || null,
  }
}

const getCachedResolvedSettings = async (
  redis: TypedRedis
): Promise<ResolvedSettings | undefined> => {
  const cached = await redis.get(RESOLVED_SETTINGS_CACHE_KEY)
  if (!cached) {
    return undefined
  }

  try {
    return JSON.parse(cached) as ResolvedSettings
  } catch {
    await redis.del(RESOLVED_SETTINGS_CACHE_KEY)
    return undefined
  }
}

const setCachedResolvedSettings = async (
  redis: TypedRedis,
  resolved: ResolvedSettings
): Promise<void> => {
  await redis.set(
    RESOLVED_SETTINGS_CACHE_KEY,
    JSON.stringify(resolved),
    'PX',
    RESOLVED_SETTINGS_CACHE_TTL
  )
}

export const invalidateResolvedSettingsCache = async (
  redis: TypedRedis
): Promise<void> => {
  await redis.del(RESOLVED_SETTINGS_CACHE_KEY)
}

export async function getResolvedSettings(
  db: DatabaseClient,
  redis?: TypedRedis
): Promise<ResolvedSettings> {
  if (redis) {
    const cached = await getCachedResolvedSettings(redis)
    if (cached) {
      return cached
    }
  }

  const resolved = resolveSettings(await getSettings(db))
  if (redis) {
    await setCachedResolvedSettings(redis, resolved)
  }
  return resolved
}

export async function getCompetitionTiming(
  db: DatabaseClient,
  redis?: TypedRedis
): Promise<CompetitionTiming> {
  const { startTime, endTime } = await getResolvedSettings(db, redis)
  return { startTime, endTime }
}
