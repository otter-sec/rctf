import { config } from '@rctf/config'
import { settings, type DatabaseClient, type EditableSettings } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { eq } from 'drizzle-orm'
import type { TypedRedis } from '../cache/scripts'

const VALUE_ID = 'value-0'
const SETTINGS_CACHE_KEY = `settings:${VALUE_ID}`
const SETTINGS_CACHE_TTL = 30_000

export interface CompetitionTiming {
  startTime: number
  endTime: number
}

export type UpdateSettingsResult =
  | { ok: true; settings: EditableSettings; changedTiming: boolean }
  | { ok: false; reason: string }

const parseCachedSettings = (raw: string): EditableSettings | null => {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as EditableSettings
    }
  } catch {
    return null
  }

  return null
}

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

export async function getCachedSettings(
  db: DatabaseClient,
  redis: TypedRedis
): Promise<EditableSettings> {
  const cached = await redis.get(SETTINGS_CACHE_KEY)
  if (cached) {
    const parsed = parseCachedSettings(cached)
    if (parsed) {
      return parsed
    }
    await invalidateSettingsCache(redis)
  }

  const data = await getSettings(db)
  await redis.set(
    SETTINGS_CACHE_KEY,
    JSON.stringify(data),
    'PX',
    SETTINGS_CACHE_TTL
  )
  return data
}

export async function invalidateSettingsCache(
  redis: TypedRedis
): Promise<void> {
  await redis.del(SETTINGS_CACHE_KEY)
}

export function patchSettings(
  current: EditableSettings,
  patch: Record<string, unknown>
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

export function settingsPatchChangesCompetitionTiming(
  patch: Record<string, unknown>
): boolean {
  return Object.hasOwn(patch, 'startTime') || Object.hasOwn(patch, 'endTime')
}

export async function updateSettings(
  db: DatabaseClient,
  patch: Record<string, unknown>,
  redis?: TypedRedis
): Promise<UpdateSettingsResult> {
  const current = await getSettings(db)
  const updated = patchSettings(current, patch)
  const changedTiming = settingsPatchChangesCompetitionTiming(patch)
  if (changedTiming) {
    const timingError = getCompetitionTimingValidationError(updated)
    if (timingError !== null) {
      return { ok: false, reason: timingError }
    }
  }

  await db
    .insert(settings)
    .values({ id: VALUE_ID, data: updated })
    .onConflictDoUpdate({
      target: settings.id,
      set: { data: updated },
    })

  if (redis) {
    await invalidateSettingsCache(redis)
  }

  return { ok: true, settings: updated, changedTiming }
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

export function resolveCompetitionTiming(
  overrides: EditableSettings
): CompetitionTiming {
  return {
    startTime: overrides.startTime ?? config.startTime,
    endTime: overrides.endTime ?? config.endTime,
  }
}

export async function getCompetitionTiming(
  db: DatabaseClient
): Promise<CompetitionTiming> {
  return resolveCompetitionTiming(await getSettings(db))
}

export async function getCachedCompetitionTiming(
  db: DatabaseClient,
  redis: TypedRedis
): Promise<CompetitionTiming> {
  return resolveCompetitionTiming(await getCachedSettings(db, redis))
}

export function getCompetitionTimingValidationError(
  overrides: EditableSettings
): string | null {
  const { startTime, endTime } = resolveCompetitionTiming(overrides)
  return startTime < endTime ? null : 'startTime must be before endTime'
}

export function resolveSettings(overrides: EditableSettings) {
  const timing = resolveCompetitionTiming(overrides)

  return {
    ctfName: overrides.ctfName ?? config.ctfName,
    homeContent: overrides.homeContent ?? config.homeContent,
    ...timing,
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
