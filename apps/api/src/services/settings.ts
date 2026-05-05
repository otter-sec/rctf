import { config } from '@rctf/config'
import { settings, type DatabaseClient, type EditableSettings } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { eq } from 'drizzle-orm'

const VALUE_ID = 'value-0'

export interface CompetitionTiming {
  startTime: number
  endTime: number
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

export async function updateSettings(
  db: DatabaseClient,
  patch: Record<string, unknown>
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
