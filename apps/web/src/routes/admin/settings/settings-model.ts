export interface Sponsor {
  name: string
  iconLight: string
  iconDark: string
  description: string
  url: string
}

export interface SponsorPayload {
  name: string
  iconLight?: string
  iconDark?: string
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
  dirty: boolean
}

interface TimingGroup {
  startTime: number | null
  endTime: number | null
  dirty: boolean
}

interface LogoGroup {
  light: string
  dark: string
  dirty: boolean
}

interface MetaGroup {
  description: string
  imageUrl: string
  dirty: boolean
}

interface SponsorsGroup {
  list: Sponsor[]
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

export function buildPatch(
  state: SettingsFormState,
  defaults: AdminSettingsShape
): SettingsPatch {
  const patch: SettingsPatch = {}

  if (state.ctfName.dirty) {
    patch.ctfName = groupMatchesDefaults(state, 'ctfName', defaults)
      ? null
      : state.ctfName.value
  }

  if (state.faviconUrl.dirty) {
    patch.faviconUrl = groupMatchesDefaults(state, 'faviconUrl', defaults)
      ? null
      : state.faviconUrl.value
  }

  if (state.timing.dirty) {
    const matches = groupMatchesDefaults(state, 'timing', defaults)
    patch.startTime = matches ? null : state.timing.startTime
    patch.endTime = matches ? null : state.timing.endTime
  }

  if (state.logo.dirty) {
    const matches = groupMatchesDefaults(state, 'logo', defaults)
    patch.logoLightUrl = matches ? null : state.logo.light
    patch.logoDarkUrl = matches ? null : state.logo.dark
  }

  if (state.homeContent.dirty) {
    patch.homeContent = groupMatchesDefaults(state, 'homeContent', defaults)
      ? null
      : state.homeContent.value
  }

  if (state.meta.dirty) {
    patch.meta = groupMatchesDefaults(state, 'meta', defaults)
      ? null
      : { description: state.meta.description, imageUrl: state.meta.imageUrl }
  }

  if (state.sponsors.dirty) {
    patch.sponsors = groupMatchesDefaults(state, 'sponsors', defaults)
      ? null
      : state.sponsors.list.map(sponsorPayload)
  }

  return patch
}

export function validateTiming(
  start: number | null,
  end: number | null,
  active: boolean
): string | null {
  if (!active) return null
  if (start === null || end === null) {
    return 'Start and end time are required.'
  }
  if (start >= end) {
    return 'Start time must be before end time.'
  }
  return null
}

export function emptySponsor(): Sponsor {
  return { name: '', iconLight: '', iconDark: '', description: '', url: '' }
}

export function toSponsor(sponsor: SponsorPayload): Sponsor {
  return {
    name: sponsor.name,
    iconLight: sponsor.iconLight ?? '',
    iconDark: sponsor.iconDark ?? '',
    description: sponsor.description,
    url: sponsor.url ?? '',
  }
}

export function sponsorPayload(sponsor: Sponsor): SponsorPayload {
  const base = {
    name: sponsor.name,
    iconLight: sponsor.iconLight,
    iconDark: sponsor.iconDark,
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

export function initialFormState(
  overrides: AdminSettingsShape,
  defaults: AdminSettingsShape
): SettingsFormState {
  const sponsorList = overrides.sponsors ?? defaults.sponsors ?? []
  return {
    ctfName: {
      value: overrides.ctfName ?? defaults.ctfName ?? '',
      dirty: false,
    },
    faviconUrl: {
      value: overrides.faviconUrl ?? defaults.faviconUrl ?? '',
      dirty: false,
    },
    timing: {
      startTime: overrides.startTime ?? defaults.startTime ?? null,
      endTime: overrides.endTime ?? defaults.endTime ?? null,
      dirty: false,
    },
    logo: {
      light: overrides.logoLightUrl ?? defaults.logoLightUrl ?? '',
      dark: overrides.logoDarkUrl ?? defaults.logoDarkUrl ?? '',
      dirty: false,
    },
    homeContent: {
      value: overrides.homeContent ?? defaults.homeContent ?? '',
      dirty: false,
    },
    meta: {
      description:
        overrides.meta?.description ?? defaults.meta?.description ?? '',
      imageUrl: overrides.meta?.imageUrl ?? defaults.meta?.imageUrl ?? '',
      dirty: false,
    },
    sponsors: {
      list: sponsorList.map(toSponsor),
      dirty: false,
    },
  }
}

export function groupMatchesDefaults(
  form: SettingsFormState,
  key: keyof SettingsFormState,
  defaults: AdminSettingsShape
): boolean {
  switch (key) {
    case 'ctfName':
      return form.ctfName.value === (defaults.ctfName ?? '')
    case 'faviconUrl':
      return form.faviconUrl.value === (defaults.faviconUrl ?? '')
    case 'timing':
      return (
        form.timing.startTime === (defaults.startTime ?? null) &&
        form.timing.endTime === (defaults.endTime ?? null)
      )
    case 'logo':
      return (
        form.logo.light === (defaults.logoLightUrl ?? '') &&
        form.logo.dark === (defaults.logoDarkUrl ?? '')
      )
    case 'homeContent':
      return form.homeContent.value === (defaults.homeContent ?? '')
    case 'meta':
      return (
        form.meta.description === (defaults.meta?.description ?? '') &&
        form.meta.imageUrl === (defaults.meta?.imageUrl ?? '')
      )
    case 'sponsors':
      return (
        JSON.stringify(form.sponsors.list) ===
        JSON.stringify((defaults.sponsors ?? []).map(toSponsor))
      )
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
