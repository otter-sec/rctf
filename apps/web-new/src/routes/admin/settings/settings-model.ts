export interface Sponsor {
  name: string
  icon: string
  description: string
  url: string
}

export interface SponsorPayload {
  name: string
  icon: string
  description: string
  url?: string
}

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

export interface OriginalOverrides {
  ctfName: boolean
  faviconUrl: boolean
  timing: boolean
  logo: boolean
  homeContent: boolean
  meta: boolean
  sponsors: boolean
}

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

export function decidePatch(
  group: { overridden: boolean; dirty: boolean },
  originalOverridden: boolean
): PatchKind {
  if (group.overridden && group.dirty) return 'set'
  if (originalOverridden && !group.overridden) return 'clear'
  return 'omit'
}

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

export function emptySponsor(): Sponsor {
  return { name: '', icon: '', description: '', url: '' }
}

export function toSponsor(sponsor: SponsorPayload): Sponsor {
  return {
    name: sponsor.name,
    icon: sponsor.icon,
    description: sponsor.description,
    url: sponsor.url ?? '',
  }
}

export function sponsorPayload(sponsor: Sponsor): SponsorPayload {
  const base = {
    name: sponsor.name,
    icon: sponsor.icon,
    description: sponsor.description,
  }
  return sponsor.url ? { ...base, url: sponsor.url } : base
}

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

export function resetGroup<K extends keyof SettingsFormState>(
  defaults: AdminSettingsShape,
  key: K
): SettingsFormState[K] {
  return { ...initialFormState({}, defaults)[key], dirty: true }
}

const settingsGroupKeys = [
  'ctfName',
  'faviconUrl',
  'timing',
  'logo',
  'homeContent',
  'meta',
  'sponsors',
] as const satisfies readonly (keyof SettingsFormState)[]

export function snapshotOverrides(form: SettingsFormState): OriginalOverrides {
  const snapshot = {} as OriginalOverrides
  for (const key of settingsGroupKeys) {
    snapshot[key] = form[key].overridden
  }
  return snapshot
}

export function clearDirty(form: SettingsFormState): void {
  for (const key of settingsGroupKeys) {
    form[key].dirty = false
  }
}

export function formatDatetimeLocal(
  timestamp: number | null | undefined
): string {
  if (timestamp === null || timestamp === undefined) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseDatetimeLocal(value: string): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}
