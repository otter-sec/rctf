import type { FlagEntry } from '@rctf/db'
import { afterAll, describe, expect, test } from 'bun:test'
import { FlagProvider } from '../../../../apps/api/src/providers/flags/base'
import {
  getFirstDefaultFlag,
  flagProviders,
  verifyFlagEntries,
} from '../../../../apps/api/src/providers/flags'
import {
  staticFlagConfigSchema,
  type StaticFlagConfig,
} from '../../../../apps/api/src/providers/flags/static'

const staticEntry = (flag: string): FlagEntry => ({
  provider: 'flags/static',
  config: { flag },
})

class CountingFlagProvider extends FlagProvider {
  readonly configSchema = staticFlagConfigSchema
  calls = 0

  protected async verifyParsed(
    config: StaticFlagConfig,
    submitted: string
  ): Promise<boolean> {
    this.calls += 1
    return config.flag === submitted
  }
}

const countingProvider = new CountingFlagProvider()
flagProviders['test-counting'] = countingProvider

afterAll(() => {
  delete flagProviders['test-counting']
})

describe('static flag provider', () => {
  test('accepts only an exact match', async () => {
    const provider = flagProviders['flags/static']!
    expect(await provider.verify({ flag: 'flag{a}' }, 'flag{a}')).toBe(true)
    expect(await provider.verify({ flag: 'flag{a}' }, 'flag{b}')).toBe(false)
    expect(await provider.verify({ flag: 'flag{a}' }, 'flag{a} ')).toBe(false)
    expect(await provider.verify({ flag: 'flag{a}' }, 'FLAG{A}')).toBe(false)
  })

  test('rejects invalid configs', async () => {
    const provider = flagProviders['flags/static']!
    expect(await provider.verify({}, 'flag{a}')).toBe(false)
    expect(await provider.verify({ flag: '' }, '')).toBe(false)
  })
})

describe('verifyFlagEntries', () => {
  test('returns the first matching entry', async () => {
    const entries = [
      { config: { flag: 'flag{a}' } },
      staticEntry('flag{b}'),
      staticEntry('flag{b}'),
    ]
    expect(await verifyFlagEntries(entries, 'flag{a}')).toEqual({
      index: 0,
      provider: 'flags/static',
    })
    expect(await verifyFlagEntries(entries, 'flag{b}')).toEqual({
      index: 1,
      provider: 'flags/static',
    })
    expect(await verifyFlagEntries(entries, 'flag{c}')).toBeNull()
    expect(await verifyFlagEntries([], 'flag{a}')).toBeNull()
  })

  test('skips unknown providers and inherited object properties', async () => {
    const entries: FlagEntry[] = [
      { provider: 'does-not-exist', config: { flag: 'flag{a}' } },
      staticEntry('flag{a}'),
    ]
    expect(await verifyFlagEntries(entries, 'flag{a}')).toEqual({
      index: 1,
      provider: 'flags/static',
    })

    for (const provider of ['constructor', 'toString', '__proto__']) {
      const polluted: FlagEntry[] = [{ provider, config: { flag: 'flag{a}' } }]
      expect(await verifyFlagEntries(polluted, 'flag{a}')).toBeNull()
    }
  })

  test('evaluates every entry without short-circuiting', async () => {
    const entries: FlagEntry[] = [
      { provider: 'test-counting', config: { flag: 'flag{a}' } },
      { provider: 'test-counting', config: { flag: 'flag{b}' } },
      { provider: 'test-counting', config: { flag: 'flag{c}' } },
    ]
    countingProvider.calls = 0
    expect(await verifyFlagEntries(entries, 'flag{a}')).toEqual({
      index: 0,
      provider: 'test-counting',
    })
    expect(countingProvider.calls).toBe(3)
  })
})

describe('getFirstDefaultFlag', () => {
  test('returns the first valid static entry', () => {
    expect(
      getFirstDefaultFlag([
        { provider: 'other', config: { flag: 'flag{x}' } },
        { provider: 'flags/static', config: {} },
        { config: { flag: 'flag{a}' } },
        staticEntry('flag{b}'),
      ])
    ).toBe('flag{a}')
    expect(getFirstDefaultFlag([])).toBe('')
    expect(getFirstDefaultFlag(undefined)).toBe('')
  })
})
