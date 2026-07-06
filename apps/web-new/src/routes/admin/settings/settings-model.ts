// Pure decision logic for the admin settings form. Kept free of `$app/*` and
// Svelte runes so it runs under `bun test`. The settings screen edits an
// overrides-vs-defaults model: `GET /v2/admin/settings` returns `{overrides,
// defaults}`; the operator edits per-group state and the save patch encodes
// three outcomes per group — edited override (send the value), previously
// overridden but reset (send `null`), or untouched (omit).

export interface Sponsor {
  name: string
  icon: string
  description: string
  url: string
}

// Payload form: `url` is optional (dropped when empty), matching the route body.
export interface SponsorPayload {
  name: string
  icon: string
  description: string
  url?: string
}

// The subset of `AdminSettings` the UI edits. Every field is optional; an
// absent field means "unset" on both the overrides and defaults sides.
export interface AdminSettingsShape {
  ctfName?: string
  faviconUrl?: string
  startTime?: number
  endTime?: number
  homeContent?: string
  logoLightUrl?: string
  logoDarkUrl?: string
  meta?: { description?: string; imageUrl?: string }
  sponsors?: SponsorPayload[]
}

// Per-group editable state. `overridden` mirrors the old app's flag (this group
// currently overrides the config default); `dirty` records whether the operator
// has touched it since load, which distinguishes an active edit from an
// untouched existing override.
interface ScalarGroup {
  value: string
  overridden: boolean
  dirty: boolean
}

interface TimingGroup {
  startTime: number | null
  endTime: number | null
  overridden: boolean
  dirty: boolean
}

interface LogoGroup {
  light: string
  dark: string
  overridden: boolean
  dirty: boolean
}

interface MetaGroup {
  description: string
  imageUrl: string
  overridden: boolean
  dirty: boolean
}

interface SponsorsGroup {
  list: Sponsor[]
  overridden: boolean
  dirty: boolean
}

export interface SettingsFormState {
  ctfName: ScalarGroup
  faviconUrl: ScalarGroup
  timing: TimingGroup
  logo: LogoGroup
  homeContent: ScalarGroup
  meta: MetaGroup
  sponsors: SponsorsGroup
}

// Whether each group was overriding the config default at load time. Needed to
// know when a now-un-overridden group must send `null` to clear the override.
export interface OriginalOverrides {
  ctfName: boolean
  faviconUrl: boolean
  timing: boolean
  logo: boolean
  homeContent: boolean
  meta: boolean
  sponsors: boolean
}

// The PUT body's `data` object. Omitted key = unchanged; `null` = clear override.
export interface SettingsPatch {
  ctfName?: string | null
  faviconUrl?: string | null
  startTime?: number | null
  endTime?: number | null
  homeContent?: string | null
  logoLightUrl?: string | null
  logoDarkUrl?: string | null
  meta?: { description: string; imageUrl: string } | null
  sponsors?: SponsorPayload[] | null
}

export type PatchKind = 'set' | 'clear' | 'omit'

/**
 * The three-way decision for a single override group.
 *
 * @param group - The group's current `overridden`/`dirty` flags.
 * @param originalOverridden - Whether the group overrode the default at load.
 */
export function decidePatch(
  group: { overridden: boolean; dirty: boolean },
  originalOverridden: boolean
): PatchKind {
  if (group.overridden && group.dirty) return 'set'
  if (originalOverridden && !group.overridden) return 'clear'
  return 'omit'
}

/**
 * Builds the settings PUT patch from the current form and the load-time
 * override snapshot. Edited overrides send their value, groups reset away from a
 * previous override send `null`, and untouched groups are omitted — so an
 * unchanged form yields `{}`.
 */
export function buildPatch(
  state: SettingsFormState,
  original: OriginalOverrides
): SettingsPatch {
  const patch: SettingsPatch = {}

  const ctfName = decidePatch(state.ctfName, original.ctfName)
  if (ctfName === 'set') patch.ctfName = state.ctfName.value
  else if (ctfName === 'clear') patch.ctfName = null

  const faviconUrl = decidePatch(state.faviconUrl, original.faviconUrl)
  if (faviconUrl === 'set') patch.faviconUrl = state.faviconUrl.value
  else if (faviconUrl === 'clear') patch.faviconUrl = null

  const timing = decidePatch(state.timing, original.timing)
  if (timing === 'set') {
    patch.startTime = state.timing.startTime
    patch.endTime = state.timing.endTime
  } else if (timing === 'clear') {
    patch.startTime = null
    patch.endTime = null
  }

  const logo = decidePatch(state.logo, original.logo)
  if (logo === 'set') {
    patch.logoLightUrl = state.logo.light
    patch.logoDarkUrl = state.logo.dark
  } else if (logo === 'clear') {
    patch.logoLightUrl = null
    patch.logoDarkUrl = null
  }

  const homeContent = decidePatch(state.homeContent, original.homeContent)
  if (homeContent === 'set') patch.homeContent = state.homeContent.value
  else if (homeContent === 'clear') patch.homeContent = null

  const meta = decidePatch(state.meta, original.meta)
  if (meta === 'set') {
    patch.meta = {
      description: state.meta.description,
      imageUrl: state.meta.imageUrl,
    }
  } else if (meta === 'clear') {
    patch.meta = null
  }

  const sponsors = decidePatch(state.sponsors, original.sponsors)
  if (sponsors === 'set')
    patch.sponsors = state.sponsors.list.map(sponsorPayload)
  else if (sponsors === 'clear') patch.sponsors = null

  return patch
}

/**
 * Client-side timing validation, run only when the timing group is overridden.
 * Returns an error string to surface, or `null` when the pair is valid (or
 * validation does not apply).
 */
export function validateTiming(
  start: number | null,
  end: number | null,
  overridden: boolean
): string | null {
  if (!overridden) return null
  if (start === null || end === null) {
    return 'Start and end time are required.'
  }
  if (start >= end) {
    return 'Start time must be before end time.'
  }
  return null
}

/** A fresh, blank sponsor row. */
export function emptySponsor(): Sponsor {
  return { name: '', icon: '', description: '', url: '' }
}

/** Normalizes a response sponsor (optional `url`) into the editable form. */
export function toSponsor(sponsor: SponsorPayload): Sponsor {
  return {
    name: sponsor.name,
    icon: sponsor.icon,
    description: sponsor.description,
    url: sponsor.url ?? '',
  }
}

/** Shapes an editable sponsor into its payload, dropping an empty `url`. */
export function sponsorPayload(sponsor: Sponsor): SponsorPayload {
  const base = {
    name: sponsor.name,
    icon: sponsor.icon,
    description: sponsor.description,
  }
  return sponsor.url ? { ...base, url: sponsor.url } : base
}

/** Keeps a selection index within `[0, length)`, clamping past the last row. */
export function clampSelected(selected: number, length: number): number {
  if (length === 0) return 0
  return Math.min(selected, length - 1)
}

export interface SponsorsState {
  list: Sponsor[]
  selected: number
}

export type SponsorAction =
  | { type: 'add' }
  | { type: 'remove'; index: number }
  | { type: 'select'; index: number }
  | { type: 'update'; index: number; field: keyof Sponsor; value: string }

/** Master-detail reducer for the sponsors editor (add/remove/select/update). */
export function sponsorsReducer(
  state: SponsorsState,
  action: SponsorAction
): SponsorsState {
  switch (action.type) {
    case 'add': {
      const list = [...state.list, emptySponsor()]
      return { list, selected: list.length - 1 }
    }
    case 'remove': {
      const list = state.list.filter((_, index) => index !== action.index)
      return { list, selected: clampSelected(state.selected, list.length) }
    }
    case 'select':
      return { ...state, selected: action.index }
    case 'update': {
      const list = state.list.map((sponsor, index) =>
        index === action.index
          ? { ...sponsor, [action.field]: action.value }
          : sponsor
      )
      return { ...state, list }
    }
  }
}

/** Whether each group overrides its default, derived from the overrides object. */
export function initialOverrides(
  overrides: AdminSettingsShape
): OriginalOverrides {
  return {
    ctfName: overrides.ctfName !== undefined,
    faviconUrl: overrides.faviconUrl !== undefined,
    timing:
      overrides.startTime !== undefined || overrides.endTime !== undefined,
    logo:
      overrides.logoLightUrl !== undefined ||
      overrides.logoDarkUrl !== undefined,
    homeContent: overrides.homeContent !== undefined,
    meta: overrides.meta !== undefined,
    sponsors: overrides.sponsors !== undefined,
  }
}

/** Seeds editable form state from the override, falling back to the default. */
export function initialFormState(
  overrides: AdminSettingsShape,
  defaults: AdminSettingsShape
): SettingsFormState {
  const overridden = initialOverrides(overrides)
  const sponsorList = overrides.sponsors ?? defaults.sponsors ?? []
  return {
    ctfName: {
      value: overrides.ctfName ?? defaults.ctfName ?? '',
      overridden: overridden.ctfName,
      dirty: false,
    },
    faviconUrl: {
      value: overrides.faviconUrl ?? defaults.faviconUrl ?? '',
      overridden: overridden.faviconUrl,
      dirty: false,
    },
    timing: {
      startTime: overrides.startTime ?? defaults.startTime ?? null,
      endTime: overrides.endTime ?? defaults.endTime ?? null,
      overridden: overridden.timing,
      dirty: false,
    },
    logo: {
      light: overrides.logoLightUrl ?? defaults.logoLightUrl ?? '',
      dark: overrides.logoDarkUrl ?? defaults.logoDarkUrl ?? '',
      overridden: overridden.logo,
      dirty: false,
    },
    homeContent: {
      value: overrides.homeContent ?? defaults.homeContent ?? '',
      overridden: overridden.homeContent,
      dirty: false,
    },
    meta: {
      description:
        overrides.meta?.description ?? defaults.meta?.description ?? '',
      imageUrl: overrides.meta?.imageUrl ?? defaults.meta?.imageUrl ?? '',
      overridden: overridden.meta,
      dirty: false,
    },
    sponsors: {
      list: sponsorList.map(toSponsor),
      overridden: overridden.sponsors,
      dirty: false,
    },
  }
}

/**
 * Formats a Unix ms timestamp as the `YYYY-MM-DDTHH:mm` value a
 * `datetime-local` input expects, in local time. Empty for a nullish input.
 */
export function formatDatetimeLocal(
  timestamp: number | null | undefined
): string {
  if (timestamp === null || timestamp === undefined) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Parses a `datetime-local` value into a Unix ms timestamp, or `null`. */
export function parseDatetimeLocal(value: string): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}
