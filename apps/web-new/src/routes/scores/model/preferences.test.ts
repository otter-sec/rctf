import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  loadScoresPreferences,
  parseScoresPreferences,
  saveScoresPreferences,
  type ScoresPreferences,
} from './preferences'

const STORAGE_KEY = 'rctf:scores:preferences'

function createMemoryStorage(overrides: Partial<Storage> = {}): Storage {
  const store = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key) {
      const value = store.get(key)
      return value === undefined ? null : value
    },
    key(index) {
      return [...store.keys()][index] ?? null
    },
    removeItem(key) {
      store.delete(key)
    },
    setItem(key, value) {
      store.set(key, value)
    },
  }
  return Object.assign(storage, overrides)
}

describe('parseScoresPreferences', () => {
  const full: ScoresPreferences = {
    viewMode: 'categories',
    sortMode: 'solves',
    showTop3Context: false,
    showSelfContext: true,
  }

  const cases: Array<[string, unknown, Partial<ScoresPreferences>]> = [
    ['null is not a record', null, {}],
    ['undefined is not a record', undefined, {}],
    ['string is not a record', 'nope', {}],
    ['number is not a record', 42, {}],
    ['array is not a record', ['challenges'], {}],
    ['empty object yields no fields', {}, {}],
    ['valid full preferences preserved', full, full],
    [
      'invalid viewMode is dropped, valid siblings kept',
      { viewMode: 'x', sortMode: 'solves' },
      { sortMode: 'solves' },
    ],
    [
      'invalid sortMode is dropped, valid siblings kept',
      { viewMode: 'categories', sortMode: 'nope' },
      { viewMode: 'categories' },
    ],
    [
      'non-boolean showTop3Context is dropped',
      { showTop3Context: 'yes', showSelfContext: false },
      { showSelfContext: false },
    ],
    ['numeric zero is not a boolean toggle', { showTop3Context: 0 }, {}],
    [
      'false is a valid boolean toggle',
      { showTop3Context: false, showSelfContext: false },
      { showTop3Context: false, showSelfContext: false },
    ],
    [
      'unknown fields are ignored',
      { viewMode: 'challenges', extra: 'ignored' },
      { viewMode: 'challenges' },
    ],
  ]

  test.each(cases)('%s', (_desc, input, expected) => {
    expect(parseScoresPreferences(input)).toEqual(expected)
  })
})

describe('loadScoresPreferences', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  test('returns no fields when the key is missing', () => {
    expect(loadScoresPreferences()).toEqual({})
  })

  test('returns no fields when the stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json{')
    expect(loadScoresPreferences()).toEqual({})
  })

  test('returns no fields (and does not throw) when getItem throws', () => {
    globalThis.localStorage = createMemoryStorage({
      getItem() {
        throw new Error('storage unavailable')
      },
    })
    expect(() => loadScoresPreferences()).not.toThrow()
    expect(loadScoresPreferences()).toEqual({})
  })

  test('parses stored preferences', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ viewMode: 'categories', showSelfContext: false })
    )
    expect(loadScoresPreferences()).toEqual({
      viewMode: 'categories',
      showSelfContext: false,
    })
  })
})

describe('saveScoresPreferences', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  test('merges a partial write over the existing preferences', () => {
    saveScoresPreferences({ viewMode: 'categories' })
    saveScoresPreferences({ sortMode: 'solves' })
    expect(loadScoresPreferences()).toEqual({
      viewMode: 'categories',
      sortMode: 'solves',
    })
  })

  test('overwrites the same field on a later write', () => {
    saveScoresPreferences({ showTop3Context: true })
    saveScoresPreferences({ showTop3Context: false })
    expect(loadScoresPreferences()).toEqual({ showTop3Context: false })
  })

  test('writes under the documented storage key', () => {
    saveScoresPreferences({ viewMode: 'categories' })
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '')).toEqual({ viewMode: 'categories' })
  })

  test('does not throw when setItem throws (quota exceeded)', () => {
    globalThis.localStorage = createMemoryStorage({
      setItem() {
        throw new Error('QuotaExceededError')
      },
    })
    expect(() =>
      saveScoresPreferences({ viewMode: 'categories' })
    ).not.toThrow()
  })
})
