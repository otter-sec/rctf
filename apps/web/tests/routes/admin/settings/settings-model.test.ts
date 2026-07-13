import {
  buildPatch,
  clampSelected,
  clearDirty,
  emptySponsor,
  formatDatetimeLocal,
  groupMatchesDefaults,
  initialFormState,
  parseDatetimeLocal,
  resetGroup,
  sponsorPayload,
  sponsorsReducer,
  validateTiming,
  type SettingsFormState,
  type SponsorsState,
} from '$routes/admin/settings/settings-model'
import { describe, expect, it } from 'bun:test'

function cleanState(): SettingsFormState {
  return {
    ctfName: { value: '', dirty: false },
    faviconUrl: { value: '', dirty: false },
    timing: { startTime: null, endTime: null, dirty: false },
    logo: { light: '', dark: '', dirty: false },
    homeContent: { value: '', dirty: false },
    meta: { description: '', imageUrl: '', dirty: false },
    sponsors: { list: [], dirty: false },
  }
}

describe('buildPatch', () => {
  it('returns an empty patch when nothing was touched', () => {
    expect(buildPatch(cleanState(), {})).toEqual({})
  })

  it('omits a group whose values differ from defaults but was not touched', () => {
    const state = cleanState()
    state.ctfName.value = 'osec CTF'
    expect(buildPatch(state, { ctfName: 'rCTF' })).toEqual({})
  })

  it('sends the value for an edited field that differs from the default', () => {
    const state = cleanState()
    state.ctfName = { value: 'osec CTF', dirty: true }
    expect(buildPatch(state, { ctfName: 'rCTF' })).toEqual({
      ctfName: 'osec CTF',
    })
  })

  it('sends null when an edited field lands back on the default', () => {
    const state = cleanState()
    state.ctfName = { value: 'rCTF', dirty: true }
    expect(buildPatch(state, { ctfName: 'rCTF' })).toEqual({ ctfName: null })
  })

  it('assembles a mixed patch of edits, resets, and untouched fields', () => {
    const state = cleanState()
    state.ctfName = { value: 'osec CTF', dirty: true }
    state.timing = { startTime: 1000, endTime: 2000, dirty: true }
    state.faviconUrl.value = '/stale.ico'
    expect(buildPatch(state, { startTime: 1000, endTime: 2000 })).toEqual({
      ctfName: 'osec CTF',
      startTime: null,
      endTime: null,
    })
  })

  it('sends both timing endpoints together when the pair is edited', () => {
    const state = cleanState()
    state.timing = {
      startTime: 1710000000000,
      endTime: 1710864000000,
      dirty: true,
    }
    expect(buildPatch(state, {})).toEqual({
      startTime: 1710000000000,
      endTime: 1710864000000,
    })
  })

  it('sends both logo urls together when the group is edited', () => {
    const state = cleanState()
    state.logo = { light: '/light.png', dark: '/dark.png', dirty: true }
    expect(buildPatch(state, {})).toEqual({
      logoLightUrl: '/light.png',
      logoDarkUrl: '/dark.png',
    })
  })

  it('shapes meta as an object when edited and null when back on defaults', () => {
    const edited = cleanState()
    edited.meta = { description: 'A CTF.', imageUrl: '/og.png', dirty: true }
    expect(buildPatch(edited, {})).toEqual({
      meta: { description: 'A CTF.', imageUrl: '/og.png' },
    })

    const reset = cleanState()
    reset.meta = { description: 'A CTF.', imageUrl: '/og.png', dirty: true }
    expect(
      buildPatch(reset, {
        meta: { description: 'A CTF.', imageUrl: '/og.png' },
      })
    ).toEqual({ meta: null })
  })

  it('drops empty sponsor urls in the payload but keeps present ones', () => {
    const state = cleanState()
    state.sponsors = {
      list: [
        {
          name: 'osec',
          iconLight: '/osec.png',
          iconDark: '',
          description: 'Research.',
          url: '',
        },
        {
          name: 'acme',
          iconLight: '/acme.png',
          iconDark: '',
          description: 'Widgets.',
          url: 'https://acme.example',
        },
      ],
      dirty: true,
    }
    expect(buildPatch(state, {})).toEqual({
      sponsors: [
        {
          name: 'osec',
          iconLight: '/osec.png',
          iconDark: '',
          description: 'Research.',
        },
        {
          name: 'acme',
          iconLight: '/acme.png',
          iconDark: '',
          description: 'Widgets.',
          url: 'https://acme.example',
        },
      ],
    })
  })

  it('sends null sponsors when the edited list matches the defaults', () => {
    const state = cleanState()
    state.sponsors = {
      list: [
        {
          name: 'osec',
          iconLight: '/i.png',
          iconDark: '',
          description: 'd',
          url: '',
        },
      ],
      dirty: true,
    }
    expect(
      buildPatch(state, {
        sponsors: [
          { name: 'osec', iconLight: '/i.png', iconDark: '', description: 'd' },
        ],
      })
    ).toEqual({ sponsors: null })
  })
})

describe('validateTiming', () => {
  it('skips validation when the timing values match the defaults', () => {
    expect(validateTiming(null, null, false)).toBeNull()
  })

  it('requires both endpoints when active', () => {
    expect(validateTiming(null, 2000, true)).toBe(
      'Start and end time are required.'
    )
    expect(validateTiming(1000, null, true)).toBe(
      'Start and end time are required.'
    )
  })

  it('requires start before end', () => {
    expect(validateTiming(2000, 1000, true)).toBe(
      'Start time must be before end time.'
    )
    expect(validateTiming(2000, 2000, true)).toBe(
      'Start time must be before end time.'
    )
  })

  it('accepts a valid ordered pair', () => {
    expect(validateTiming(1000, 2000, true)).toBeNull()
  })
})

describe('sponsorPayload', () => {
  it('includes url when it is non-empty', () => {
    expect(
      sponsorPayload({
        name: 'osec',
        iconLight: '/i.png',
        iconDark: '',
        description: 'd',
        url: 'https://osec.io',
      })
    ).toEqual({
      name: 'osec',
      iconLight: '/i.png',
      iconDark: '',
      description: 'd',
      url: 'https://osec.io',
    })
  })

  it('omits url when it is empty', () => {
    expect(
      sponsorPayload({
        name: 'osec',
        iconLight: '/i.png',
        iconDark: '',
        description: 'd',
        url: '',
      })
    ).toEqual({
      name: 'osec',
      iconLight: '/i.png',
      iconDark: '',
      description: 'd',
    })
  })
})

describe('clampSelected', () => {
  it('keeps an in-range index', () => {
    expect(clampSelected(1, 3)).toBe(1)
  })

  it('clamps past the last index', () => {
    expect(clampSelected(5, 3)).toBe(2)
  })

  it('yields zero for an empty list', () => {
    expect(clampSelected(0, 0)).toBe(0)
  })
})

describe('sponsorsReducer', () => {
  const base: SponsorsState = {
    list: [
      {
        name: 'osec',
        iconLight: '/i.png',
        iconDark: '',
        description: 'd',
        url: '',
      },
    ],
    selected: 0,
  }

  it('adds an empty sponsor and selects it', () => {
    const next = sponsorsReducer(base, { type: 'add' })
    expect(next.list).toHaveLength(2)
    expect(next.list[1]).toEqual(emptySponsor())
    expect(next.selected).toBe(1)
  })

  it('removes a sponsor and clamps the selection', () => {
    const two: SponsorsState = {
      list: [
        { name: 'a', iconLight: '', iconDark: '', description: '', url: '' },
        { name: 'b', iconLight: '', iconDark: '', description: '', url: '' },
      ],
      selected: 1,
    }
    const next = sponsorsReducer(two, { type: 'remove', index: 1 })
    expect(next.list).toEqual([
      { name: 'a', iconLight: '', iconDark: '', description: '', url: '' },
    ])
    expect(next.selected).toBe(0)
  })

  it('updates a single field of the selected sponsor', () => {
    const next = sponsorsReducer(base, {
      type: 'update',
      index: 0,
      field: 'name',
      value: 'renamed',
    })
    expect(next.list[0]?.name).toBe('renamed')
    expect(base.list[0]?.name).toBe('osec')
  })

  it('selects a sponsor by index', () => {
    const two: SponsorsState = {
      list: [
        { name: 'a', iconLight: '', iconDark: '', description: '', url: '' },
        { name: 'b', iconLight: '', iconDark: '', description: '', url: '' },
      ],
      selected: 0,
    }
    expect(sponsorsReducer(two, { type: 'select', index: 1 }).selected).toBe(1)
  })
})

describe('datetime-local conversion', () => {
  it('round-trips a timestamp to the minute', () => {
    const ts = new Date(2024, 2, 9, 13, 45).getTime()
    expect(parseDatetimeLocal(formatDatetimeLocal(ts))).toBe(ts)
  })

  it('formats an empty value for null or undefined', () => {
    expect(formatDatetimeLocal(null)).toBe('')
    expect(formatDatetimeLocal(undefined)).toBe('')
  })

  it('parses an empty string to null', () => {
    expect(parseDatetimeLocal('')).toBeNull()
  })
})

describe('reset builders', () => {
  const defaults = {
    ctfName: 'rCTF',
    faviconUrl: '/fav.ico',
    startTime: 1000,
    endTime: 2000,
    homeContent: '# Welcome',
    logoLightUrl: '/light.png',
    logoDarkUrl: '/dark.png',
    meta: { description: 'A CTF.', imageUrl: '/og.png' },
    sponsors: [
      {
        name: 'osec',
        iconLight: '/osec.png',
        iconDark: '',
        description: 'Research.',
      },
      {
        name: 'acme',
        iconLight: '/acme.png',
        iconDark: '',
        description: 'Widgets.',
        url: 'https://acme.example',
      },
    ],
  }

  it('resets scalar groups to defaults, marked dirty', () => {
    expect(resetGroup(defaults, 'ctfName')).toEqual({
      value: 'rCTF',
      dirty: true,
    })
    expect(resetGroup({}, 'ctfName')).toEqual({ value: '', dirty: true })
    expect(resetGroup(defaults, 'faviconUrl')).toEqual({
      value: '/fav.ico',
      dirty: true,
    })
  })

  it('resets timing to defaults, falling back to null', () => {
    expect(resetGroup(defaults, 'timing')).toEqual({
      startTime: 1000,
      endTime: 2000,
      dirty: true,
    })
    expect(resetGroup({}, 'timing')).toEqual({
      startTime: null,
      endTime: null,
      dirty: true,
    })
  })

  it('resets logos to defaults, falling back to empty strings', () => {
    expect(resetGroup(defaults, 'logo')).toEqual({
      light: '/light.png',
      dark: '/dark.png',
      dirty: true,
    })
    expect(resetGroup({}, 'logo')).toEqual({ light: '', dark: '', dirty: true })
  })

  it('resets home content to the default, falling back to empty', () => {
    expect(resetGroup(defaults, 'homeContent')).toEqual({
      value: '# Welcome',
      dirty: true,
    })
    expect(resetGroup({}, 'homeContent')).toEqual({ value: '', dirty: true })
  })

  it('resets meta to defaults, falling back to empty strings', () => {
    expect(resetGroup(defaults, 'meta')).toEqual({
      description: 'A CTF.',
      imageUrl: '/og.png',
      dirty: true,
    })
    expect(resetGroup({}, 'meta')).toEqual({
      description: '',
      imageUrl: '',
      dirty: true,
    })
  })

  it('resets sponsors from the default list, mapping missing urls to empty', () => {
    expect(resetGroup(defaults, 'sponsors')).toEqual({
      list: [
        {
          name: 'osec',
          iconLight: '/osec.png',
          iconDark: '',
          description: 'Research.',
          url: '',
        },
        {
          name: 'acme',
          iconLight: '/acme.png',
          iconDark: '',
          description: 'Widgets.',
          url: 'https://acme.example',
        },
      ],
      dirty: true,
    })
    expect(resetGroup({}, 'sponsors')).toEqual({ list: [], dirty: true })
  })
})

describe('clearDirty', () => {
  it('clears the dirty bit on every form group', () => {
    const state = cleanState()
    const groupKeys = Object.keys(state) as (keyof SettingsFormState)[]
    for (const key of groupKeys) state[key].dirty = true
    clearDirty(state)
    for (const key of groupKeys) expect(state[key].dirty).toBe(false)
  })
})

describe('initialFormState', () => {
  it('seeds each field from the override, falling back to the default', () => {
    const state = initialFormState(
      { ctfName: 'osec CTF' },
      { ctfName: 'rCTF', faviconUrl: '/fav.ico' }
    )
    expect(state.ctfName).toEqual({ value: 'osec CTF', dirty: false })
    expect(state.faviconUrl).toEqual({ value: '/fav.ico', dirty: false })
  })
})

describe('groupMatchesDefaults', () => {
  const defaults = {
    ctfName: 'rCTF',
    startTime: 100,
    endTime: 200,
    logoLightUrl: '/light.svg',
    meta: { description: 'desc', imageUrl: '/og.png' },
    sponsors: [
      {
        name: 'acme',
        iconLight: '/i.png',
        iconDark: '',
        description: 'sponsor',
      },
    ],
  }

  it('matches when a scalar equals the default and diverges after an edit', () => {
    const state = cleanState()
    state.ctfName.value = 'rCTF'
    expect(groupMatchesDefaults(state, 'ctfName', defaults)).toBe(true)
    state.ctfName.value = 'rCTFx'
    expect(groupMatchesDefaults(state, 'ctfName', defaults)).toBe(false)
  })

  it('treats a missing default as the empty string', () => {
    const state = cleanState()
    expect(groupMatchesDefaults(state, 'faviconUrl', defaults)).toBe(true)
    expect(groupMatchesDefaults(state, 'homeContent', {})).toBe(true)
  })

  it('requires both timing values to match', () => {
    const state = cleanState()
    state.timing.startTime = 100
    state.timing.endTime = 200
    expect(groupMatchesDefaults(state, 'timing', defaults)).toBe(true)
    state.timing.endTime = 300
    expect(groupMatchesDefaults(state, 'timing', defaults)).toBe(false)
  })

  it('requires both logo urls to match', () => {
    const state = cleanState()
    state.logo.light = '/light.svg'
    expect(groupMatchesDefaults(state, 'logo', defaults)).toBe(true)
    state.logo.dark = '/dark.svg'
    expect(groupMatchesDefaults(state, 'logo', defaults)).toBe(false)
  })

  it('compares both meta fields', () => {
    const state = cleanState()
    state.meta.description = 'desc'
    state.meta.imageUrl = '/og.png'
    expect(groupMatchesDefaults(state, 'meta', defaults)).toBe(true)
    state.meta.description = 'other'
    expect(groupMatchesDefaults(state, 'meta', defaults)).toBe(false)
  })

  it('compares the sponsor list against normalized defaults', () => {
    const state = cleanState()
    state.sponsors.list = [
      {
        name: 'acme',
        iconLight: '/i.png',
        iconDark: '',
        description: 'sponsor',
        url: '',
      },
    ]
    expect(groupMatchesDefaults(state, 'sponsors', defaults)).toBe(true)
    state.sponsors.list = []
    expect(groupMatchesDefaults(state, 'sponsors', defaults)).toBe(false)
  })
})
