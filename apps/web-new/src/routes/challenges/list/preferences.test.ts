import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  parsePreferences,
  savePreferences,
  type ChallengesPreferences,
} from './preferences'

const STORAGE_KEY = 'rctf:challenges:preferences'

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

const defaults: ChallengesPreferences = {
  hideSolved: false,
  collapsedCategories: [],
}

describe('parsePreferences', () => {
  const cases: Array<[string, unknown, ChallengesPreferences]> = [
    ['null is not a record', null, defaults],
    ['undefined is not a record', undefined, defaults],
    ['string is not a record', 'nope', defaults],
    ['number is not a record', 42, defaults],
    ['array is not a record', ['web'], defaults],
    ['empty object uses defaults', {}, defaults],
    [
      'valid full preferences preserved',
      { hideSolved: true, collapsedCategories: ['web', 'pwn'] },
      { hideSolved: true, collapsedCategories: ['web', 'pwn'] },
    ],
    [
      'wrong-typed hideSolved defaults while valid collapsedCategories kept',
      { hideSolved: 'yes', collapsedCategories: ['web'] },
      { hideSolved: false, collapsedCategories: ['web'] },
    ],
    [
      'wrong-typed collapsedCategories defaults while valid hideSolved kept',
      { hideSolved: true, collapsedCategories: 'nope' },
      { hideSolved: true, collapsedCategories: [] },
    ],
    [
      'collapsedCategories with a non-string element rejected wholesale',
      { hideSolved: true, collapsedCategories: ['a', 1, 'b'] },
      { hideSolved: true, collapsedCategories: [] },
    ],
    [
      'null collapsedCategories defaults',
      { hideSolved: true, collapsedCategories: null },
      { hideSolved: true, collapsedCategories: [] },
    ],
    [
      'empty collapsedCategories array preserved',
      { hideSolved: false, collapsedCategories: [] },
      { hideSolved: false, collapsedCategories: [] },
    ],
    [
      'empty string is a valid category',
      { collapsedCategories: [''] },
      { hideSolved: false, collapsedCategories: [''] },
    ],
    [
      'numeric zero is not a boolean',
      { hideSolved: 0, collapsedCategories: [] },
      { hideSolved: false, collapsedCategories: [] },
    ],
    [
      'unknown fields ignored',
      {
        hideSolved: true,
        collapsedCategories: ['x'],
        extra: 'ignored',
        another: 123,
      },
      { hideSolved: true, collapsedCategories: ['x'] },
    ],
  ]

  test.each(cases)('%s', (_desc, input, expected) => {
    expect(parsePreferences(input)).toEqual(expected)
  })

  test('DEFAULT_PREFERENCES matches the documented shape', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      hideSolved: false,
      collapsedCategories: [],
    })
  })
})

describe('loadPreferences', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  test('returns defaults when the key is missing', () => {
    expect(loadPreferences()).toEqual(defaults)
  })

  test('returns defaults when the stored value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json{')
    expect(loadPreferences()).toEqual(defaults)
  })

  test('returns defaults (and does not throw) when getItem throws', () => {
    globalThis.localStorage = createMemoryStorage({
      getItem() {
        throw new Error('storage unavailable')
      },
    })
    expect(() => loadPreferences()).not.toThrow()
    expect(loadPreferences()).toEqual(defaults)
  })

  test('parses stored preferences', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ hideSolved: true, collapsedCategories: ['web'] })
    )
    expect(loadPreferences()).toEqual({
      hideSolved: true,
      collapsedCategories: ['web'],
    })
  })

  test('returns a fresh collapsedCategories array so defaults are not mutated', () => {
    const first = loadPreferences()
    first.collapsedCategories.push('leaked')
    expect(loadPreferences().collapsedCategories).toEqual([])
  })
})

describe('savePreferences', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  test('round-trips through loadPreferences', () => {
    const prefs: ChallengesPreferences = {
      hideSolved: true,
      collapsedCategories: ['web', 'pwn'],
    }
    savePreferences(prefs)
    expect(loadPreferences()).toEqual(prefs)
  })

  test('writes under the documented storage key', () => {
    savePreferences({ hideSolved: true, collapsedCategories: ['crypto'] })
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '')).toEqual({
      hideSolved: true,
      collapsedCategories: ['crypto'],
    })
  })

  test('overwrites previously stored preferences', () => {
    savePreferences({ hideSolved: true, collapsedCategories: ['web'] })
    savePreferences({ hideSolved: false, collapsedCategories: [] })
    expect(loadPreferences()).toEqual(defaults)
  })

  test('does not throw when setItem throws (quota exceeded)', () => {
    globalThis.localStorage = createMemoryStorage({
      setItem() {
        throw new Error('QuotaExceededError')
      },
    })
    expect(() =>
      savePreferences({ hideSolved: true, collapsedCategories: ['web'] })
    ).not.toThrow()
  })
})
