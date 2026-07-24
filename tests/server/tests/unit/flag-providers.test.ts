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
  test('matches an exact flag', async () => {
    const provider = flagProviders['flags/static']!
    expect(await provider.verify({ flag: 'flag{a}' }, 'flag{a}')).toBe(true)
  })

  test('rejects a wrong flag', async () => {
    const provider = flagProviders['flags/static']!
    expect(await provider.verify({ flag: 'flag{a}' }, 'flag{b}')).toBe(false)
    expect(await provider.verify({ flag: 'flag{a}' }, 'flag{a} ')).toBe(false)
    expect(await provider.verify({ flag: 'flag{a}' }, 'FLAG{A}')).toBe(false)
  })

  test('rejects an invalid config', async () => {
    const provider = flagProviders['flags/static']!
    expect(await provider.verify({}, 'flag{a}')).toBe(false)
  })

  test('rejects an empty flag even for an empty submission', async () => {
    const provider = flagProviders['flags/static']!
    expect(await provider.verify({ flag: '' }, '')).toBe(false)
  })
})

describe('verifyFlagEntries', () => {
  test('any matching entry solves', async () => {
    const entries = [staticEntry('flag{a}'), staticEntry('flag{b}')]
    expect(await verifyFlagEntries(entries, 'flag{a}')).toEqual({
      index: 0,
      provider: 'flags/static',
    })
    expect(await verifyFlagEntries(entries, 'flag{b}')).toEqual({
      index: 1,
      provider: 'flags/static',
    })
    expect(await verifyFlagEntries(entries, 'flag{c}')).toBeNull()
  })

  test('returns the first matching entry', async () => {
    const entries = [staticEntry('flag{dup}'), staticEntry('flag{dup}')]
    expect(await verifyFlagEntries(entries, 'flag{dup}')).toEqual({
      index: 0,
      provider: 'flags/static',
    })
  })

  test('skips entries with unknown providers', async () => {
    const entries: FlagEntry[] = [
      { provider: 'does-not-exist', config: { flag: 'flag{a}' } },
      staticEntry('flag{a}'),
    ]
    expect(await verifyFlagEntries(entries, 'flag{a}')).toEqual({
      index: 1,
      provider: 'flags/static',
    })
  })

  test('does not resolve inherited object properties as providers', async () => {
    for (const provider of ['constructor', 'toString', '__proto__']) {
      const entries: FlagEntry[] = [{ provider, config: { flag: 'flag{a}' } }]
      expect(await verifyFlagEntries(entries, 'flag{a}')).toBeNull()
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

  test('returns null for an empty list', async () => {
    expect(await verifyFlagEntries([], 'flag{a}')).toBeNull()
  })

  test('defaults a missing provider to flags/static', async () => {
    const entries: FlagEntry[] = [{ config: { flag: 'flag{a}' } }]
    expect(await verifyFlagEntries(entries, 'flag{a}')).toEqual({
      index: 0,
      provider: 'flags/static',
    })
  })
})

describe('firstStaticFlag', () => {
  test('returns the first static entry flag', () => {
    expect(
      getFirstDefaultFlag([staticEntry('flag{a}'), staticEntry('flag{b}')])
    ).toBe('flag{a}')
  })

  test('skips non-static and invalid entries', () => {
    expect(
      getFirstDefaultFlag([
        { provider: 'other', config: { flag: 'flag{x}' } },
        { provider: 'flags/static', config: {} },
        staticEntry('flag{a}'),
      ])
    ).toBe('flag{a}')
  })

  test('treats a missing provider as flags/static', () => {
    expect(getFirstDefaultFlag([{ config: { flag: 'flag{a}' } }])).toBe(
      'flag{a}'
    )
  })

  test('returns an empty string when nothing matches', () => {
    expect(getFirstDefaultFlag([])).toBe('')
    expect(getFirstDefaultFlag(undefined)).toBe('')
  })
})
