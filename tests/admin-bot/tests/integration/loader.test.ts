import { describe, test, expect, beforeEach } from 'bun:test'
import { ChallengeLoader } from '../../../../apps/admin-bot/src/core/loader'
import { Challenge } from '../../../../apps/admin-bot/src/types'

const validChallengeSource = `
const { Challenge } = require('../types')
export const challenge = new Challenge({
  timeoutMilliseconds: 5000,
  inputs: { url: '^https?://.*' },
  handler: async (ctx) => {},
  hooksConfig: {
    showConsoleLogs: false,
    showBrowserErrors: false,
    showNavigation: false,
    limitTabsNumber: -1,
  },
})
`

describe('ChallengeLoader.loadChallenge', () => {
  let loader: ChallengeLoader

  beforeEach(() => {
    loader = new ChallengeLoader()
  })

  test('loads valid TS source and returns Challenge instance', async () => {
    const result = await loader.loadChallenge(validChallengeSource)
    expect(result).toBeInstanceOf(Challenge)
    if (result instanceof Challenge) {
      expect(result.config.timeoutMilliseconds).toBe(5000)
      expect(result.config.inputs).toEqual({ url: '^https?://.*' })
    }
  })

  test('returns error string for missing challenge export', async () => {
    const source = `export const notChallenge = 42`
    const result = await loader.loadChallenge(source)
    expect(typeof result).toBe('string')
    expect(result as string).toContain('missing challenge export')
  })

  test('returns error string for non-Challenge export', async () => {
    const source = `export const challenge = { not: 'a challenge' }`
    const result = await loader.loadChallenge(source)
    expect(typeof result).toBe('string')
    expect(result as string).toContain(
      'challenge export must be an instance of Challenge class'
    )
  })

  test('returns error string for syntax errors', async () => {
    const source = `export const challenge = <<<invalid>>>`
    const result = await loader.loadChallenge(source)
    expect(typeof result).toBe('string')
  })

  test('returns error string for disallowed imports', async () => {
    const source = `
      const fs = require('fs')
      export const challenge = null
    `
    const result = await loader.loadChallenge(source)
    expect(typeof result).toBe('string')
    expect(result as string).toContain('not allowed')
  })
})

describe('ChallengeLoader.loadFromSource', () => {
  let loader: ChallengeLoader

  beforeEach(() => {
    loader = new ChallengeLoader()
  })

  test('caches by id:revision', async () => {
    const challenge = await loader.loadFromSource(
      'chal-1',
      'rev-1',
      validChallengeSource
    )
    expect(challenge).toBeInstanceOf(Challenge)
    expect(loader.get('chal-1', 'rev-1')).toBe(challenge)
  })

  test('evicts old revisions for same challenge', async () => {
    await loader.loadFromSource('chal-1', 'rev-1', validChallengeSource)
    expect(loader.get('chal-1', 'rev-1')).toBeInstanceOf(Challenge)

    await loader.loadFromSource('chal-1', 'rev-2', validChallengeSource)
    expect(loader.get('chal-1', 'rev-1')).toBeUndefined()
    expect(loader.get('chal-1', 'rev-2')).toBeInstanceOf(Challenge)
  })

  test('rejects duplicate id:revision', async () => {
    await loader.loadFromSource('chal-1', 'rev-1', validChallengeSource)
    const dup = await loader.loadFromSource(
      'chal-1',
      'rev-1',
      validChallengeSource
    )
    expect(dup).toBeUndefined()
  })

  test('returns undefined for invalid source', async () => {
    const result = await loader.loadFromSource(
      'chal-1',
      'rev-1',
      'not valid code <<<>>>'
    )
    expect(result).toBeUndefined()
  })
})

describe('ChallengeLoader cache management', () => {
  let loader: ChallengeLoader

  beforeEach(() => {
    loader = new ChallengeLoader()
  })

  test('get returns undefined for non-existent', () => {
    expect(loader.get('nope', 'nope')).toBeUndefined()
  })

  test('getAll returns all loaded challenges', async () => {
    await loader.loadFromSource('chal-1', 'rev-1', validChallengeSource)
    await loader.loadFromSource('chal-2', 'rev-1', validChallengeSource)
    const all = loader.getAll()
    expect(all.length).toBe(2)
    const ids = all.map(([[id]]) => id).sort()
    expect(ids).toEqual(['chal-1', 'chal-2'])
  })

  test('unload removes challenge and returns true', async () => {
    await loader.loadFromSource('chal-1', 'rev-1', validChallengeSource)
    expect(loader.unload('chal-1', 'rev-1')).toBe(true)
    expect(loader.get('chal-1', 'rev-1')).toBeUndefined()
  })

  test('unload returns false for non-existent', () => {
    expect(loader.unload('nope', 'nope')).toBe(false)
  })
})
