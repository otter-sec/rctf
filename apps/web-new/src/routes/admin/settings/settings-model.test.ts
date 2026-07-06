import { describe, expect, it } from 'bun:test'
import {
  buildPatch,
  clampSelected,
  decidePatch,
  emptySponsor,
  formatDatetimeLocal,
  initialFormState,
  initialOverrides,
  parseDatetimeLocal,
  sponsorPayload,
  sponsorsReducer,
  validateTiming,
  type OriginalOverrides,
  type SettingsFormState,
  type SponsorsState,
} from './settings-model'

function cleanState(): SettingsFormState {
  return {
    ctfName: { value: '', overridden: false, dirty: false },
    faviconUrl: { value: '', overridden: false, dirty: false },
    timing: { startTime: null, endTime: null, overridden: false, dirty: false },
    logo: { light: '', dark: '', overridden: false, dirty: false },
    homeContent: { value: '', overridden: false, dirty: false },
    meta: { description: '', imageUrl: '', overridden: false, dirty: false },
    sponsors: { list: [], overridden: false, dirty: false },
  }
}

function cleanOriginal(): OriginalOverrides {
  return {
    ctfName: false,
    faviconUrl: false,
    timing: false,
    logo: false,
    homeContent: false,
    meta: false,
    sponsors: false,
  }
}

describe('decidePatch', () => {
  it('sets when overridden and dirty', () => {
    expect(decidePatch({ overridden: true, dirty: true }, false)).toBe('set')
  })

  it('clears when previously overridden but no longer overridden', () => {
    expect(decidePatch({ overridden: false, dirty: true }, true)).toBe('clear')
    expect(decidePatch({ overridden: false, dirty: false }, true)).toBe('clear')
  })

  it('omits an overridden group left untouched', () => {
    expect(decidePatch({ overridden: true, dirty: false }, true)).toBe('omit')
  })

  it('omits a group that was never overridden and stays clean', () => {
    expect(decidePatch({ overridden: false, dirty: false }, false)).toBe('omit')
  })
})

describe('buildPatch', () => {
  it('returns an empty patch when nothing changed (AE5)', () => {
    expect(buildPatch(cleanState(), cleanOriginal())).toEqual({})
  })

  it('omits an originally-overridden group that is left untouched', () => {
    const state = cleanState()
    state.ctfName = { value: 'rCTF', overridden: true, dirty: false }
    const original = { ...cleanOriginal(), ctfName: true }
    expect(buildPatch(state, original)).toEqual({})
  })

  it('sends the value for an edited override', () => {
    const state = cleanState()
    state.ctfName = { value: 'osec CTF', overridden: true, dirty: true }
    expect(buildPatch(state, cleanOriginal())).toEqual({ ctfName: 'osec CTF' })
  })

  it('sends null when a previously-overridden field is reset to default', () => {
    const state = cleanState()
    state.ctfName = { value: 'default', overridden: false, dirty: true }
    const original = { ...cleanOriginal(), ctfName: true }
    expect(buildPatch(state, original)).toEqual({ ctfName: null })
  })

  it('assembles a mixed patch of edits, resets, and untouched fields', () => {
    const state = cleanState()
    state.ctfName = { value: 'osec CTF', overridden: true, dirty: true }
    state.timing = {
      startTime: 1000,
      endTime: 2000,
      overridden: false,
      dirty: true,
    }
    state.faviconUrl = { value: '/fav.ico', overridden: true, dirty: false }
    const original = { ...cleanOriginal(), timing: true, faviconUrl: true }
    expect(buildPatch(state, original)).toEqual({
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
      overridden: true,
      dirty: true,
    }
    expect(buildPatch(state, cleanOriginal())).toEqual({
      startTime: 1710000000000,
      endTime: 1710864000000,
    })
  })

  it('sends both logo urls together when the group is edited', () => {
    const state = cleanState()
    state.logo = {
      light: '/light.png',
      dark: '/dark.png',
      overridden: true,
      dirty: true,
    }
    expect(buildPatch(state, cleanOriginal())).toEqual({
      logoLightUrl: '/light.png',
      logoDarkUrl: '/dark.png',
    })
  })

  it('shapes meta as an object when edited and null when reset', () => {
    const edited = cleanState()
    edited.meta = {
      description: 'A CTF.',
      imageUrl: '/og.png',
      overridden: true,
      dirty: true,
    }
    expect(buildPatch(edited, cleanOriginal())).toEqual({
      meta: { description: 'A CTF.', imageUrl: '/og.png' },
    })

    const reset = cleanState()
    reset.meta = {
      description: '',
      imageUrl: '',
      overridden: false,
      dirty: true,
    }
    expect(buildPatch(reset, { ...cleanOriginal(), meta: true })).toEqual({
      meta: null,
    })
  })

  it('drops empty sponsor urls in the payload but keeps present ones', () => {
    const state = cleanState()
    state.sponsors = {
      list: [
        { name: 'osec', icon: '/osec.png', description: 'Research.', url: '' },
        {
          name: 'acme',
          icon: '/acme.png',
          description: 'Widgets.',
          url: 'https://acme.example',
        },
      ],
      overridden: true,
      dirty: true,
    }
    expect(buildPatch(state, cleanOriginal())).toEqual({
      sponsors: [
        { name: 'osec', icon: '/osec.png', description: 'Research.' },
        {
          name: 'acme',
          icon: '/acme.png',
          description: 'Widgets.',
          url: 'https://acme.example',
        },
      ],
    })
  })
})

describe('validateTiming', () => {
  it('skips validation when the group is not overridden', () => {
    expect(validateTiming(null, null, false)).toBeNull()
  })

  it('requires both endpoints when overridden', () => {
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
        icon: '/i.png',
        description: 'd',
        url: 'https://osec.io',
      })
    ).toEqual({
      name: 'osec',
      icon: '/i.png',
      description: 'd',
      url: 'https://osec.io',
    })
  })

  it('omits url when it is empty', () => {
    expect(
      sponsorPayload({
        name: 'osec',
        icon: '/i.png',
        description: 'd',
        url: '',
      })
    ).toEqual({ name: 'osec', icon: '/i.png', description: 'd' })
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
    list: [{ name: 'osec', icon: '/i.png', description: 'd', url: '' }],
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
        { name: 'a', icon: '', description: '', url: '' },
        { name: 'b', icon: '', description: '', url: '' },
      ],
      selected: 1,
    }
    const next = sponsorsReducer(two, { type: 'remove', index: 1 })
    expect(next.list).toEqual([
      { name: 'a', icon: '', description: '', url: '' },
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
        { name: 'a', icon: '', description: '', url: '' },
        { name: 'b', icon: '', description: '', url: '' },
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

describe('initialOverrides', () => {
  it('marks a group overridden when any of its fields is present', () => {
    expect(initialOverrides({ ctfName: 'osec', startTime: 1000 })).toEqual({
      ctfName: true,
      faviconUrl: false,
      timing: true,
      logo: false,
      homeContent: false,
      meta: false,
      sponsors: false,
    })
  })
})

describe('initialFormState', () => {
  it('seeds each field from the override, falling back to the default', () => {
    const state = initialFormState(
      { ctfName: 'osec CTF' },
      { ctfName: 'rCTF', faviconUrl: '/fav.ico' }
    )
    expect(state.ctfName).toEqual({
      value: 'osec CTF',
      overridden: true,
      dirty: false,
    })
    expect(state.faviconUrl).toEqual({
      value: '/fav.ico',
      overridden: false,
      dirty: false,
    })
  })
})
