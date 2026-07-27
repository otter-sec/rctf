import { createDatabase, users, type FlagEntry } from '@rctf/db'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { inArray } from 'drizzle-orm'
import {
  FlagProvider,
  FlagVerifyStatus,
  type FlagVerifyResult,
} from '../../../../apps/api/src/providers/flags/base'
import {
  getFirstDefaultFlag,
  flagProviders,
  verifyFlagEntries,
} from '../../../../apps/api/src/providers/flags'
import { DynamicFlagMode } from '../../../../apps/api/src/providers/flags/dynamic'
import {
  staticFlagConfigSchema,
  type StaticFlagConfig,
} from '../../../../apps/api/src/providers/flags/static'

const db = createDatabase('unused-by-test-mock').db
const teamA = crypto.randomUUID()
const teamB = crypto.randomUUID()
const ctx = { db, teamId: teamA, challengeId: 'chall-x' }

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
  ): Promise<FlagVerifyResult> {
    this.calls += 1
    return {
      status:
        config.flag === submitted
          ? FlagVerifyStatus.ACCEPTED
          : FlagVerifyStatus.REJECTED,
    }
  }

  protected async getForTeamParsed(): Promise<string | null> {
    return null
  }
}

const countingProvider = new CountingFlagProvider()
flagProviders['test-counting'] = countingProvider

beforeAll(async () => {
  await db.insert(users).values([
    {
      id: teamA,
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@example.com`,
      division: 'other',
      perms: 0,
    },
    {
      id: teamB,
      name: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@example.com`,
      division: 'other',
      perms: 0,
    },
  ])
})

afterAll(async () => {
  delete flagProviders['test-counting']
  await db.delete(users).where(inArray(users.id, [teamA, teamB]))
})

const verifyStatus = async (
  provider: FlagProvider,
  config: Record<string, unknown>,
  submitted: string
): Promise<FlagVerifyStatus> =>
  (await provider.verify(config, submitted, ctx)).status

describe('static flag provider', () => {
  test('accepts only an exact match', async () => {
    const provider = flagProviders['flags/static']!
    expect(await verifyStatus(provider, { flag: 'flag{a}' }, 'flag{a}')).toBe(
      FlagVerifyStatus.ACCEPTED
    )
    expect(await verifyStatus(provider, { flag: 'flag{a}' }, 'flag{b}')).toBe(
      FlagVerifyStatus.REJECTED
    )
    expect(await verifyStatus(provider, { flag: 'flag{a}' }, 'flag{a} ')).toBe(
      FlagVerifyStatus.REJECTED
    )
    expect(await verifyStatus(provider, { flag: 'flag{a}' }, 'FLAG{A}')).toBe(
      FlagVerifyStatus.REJECTED
    )
  })

  test('rejects invalid configs', async () => {
    const provider = flagProviders['flags/static']!
    expect(await verifyStatus(provider, {}, 'flag{a}')).toBe(
      FlagVerifyStatus.REJECTED
    )
    expect(await verifyStatus(provider, { flag: '' }, '')).toBe(
      FlagVerifyStatus.REJECTED
    )
    expect(
      await verifyStatus(provider, { flag: 'flag{a}', typo: true }, 'flag{a}')
    ).toBe(FlagVerifyStatus.REJECTED)
  })
})

describe('verifyFlagEntries', () => {
  test('returns the first matching entry', async () => {
    const entries = [
      { config: { flag: 'flag{a}' } },
      staticEntry('flag{b}'),
      staticEntry('flag{b}'),
    ]
    expect(await verifyFlagEntries(entries, 'flag{a}', ctx)).toEqual({
      matched: {
        index: 0,
        provider: 'flags/static',
        config: { flag: 'flag{a}' },
      },
      cheated: false,
    })
    expect(await verifyFlagEntries(entries, 'flag{b}', ctx)).toEqual({
      matched: {
        index: 1,
        provider: 'flags/static',
        config: { flag: 'flag{b}' },
      },
      cheated: false,
    })
    expect(
      (await verifyFlagEntries(entries, 'flag{c}', ctx)).matched
    ).toBeNull()
    expect((await verifyFlagEntries([], 'flag{a}', ctx)).matched).toBeNull()
  })

  test('skips unknown providers and inherited object properties', async () => {
    const entries: FlagEntry[] = [
      { provider: 'does-not-exist', config: { flag: 'flag{a}' } },
      staticEntry('flag{a}'),
    ]
    expect(await verifyFlagEntries(entries, 'flag{a}', ctx)).toEqual({
      matched: {
        index: 1,
        provider: 'flags/static',
        config: { flag: 'flag{a}' },
      },
      cheated: false,
    })

    for (const provider of ['constructor', 'toString', '__proto__']) {
      const polluted: FlagEntry[] = [{ provider, config: { flag: 'flag{a}' } }]
      expect(
        (await verifyFlagEntries(polluted, 'flag{a}', ctx)).matched
      ).toBeNull()
    }
  })

  test('evaluates every entry without short-circuiting', async () => {
    const entries: FlagEntry[] = [
      { provider: 'test-counting', config: { flag: 'flag{a}' } },
      { provider: 'test-counting', config: { flag: 'flag{b}' } },
      { provider: 'test-counting', config: { flag: 'flag{c}' } },
    ]
    countingProvider.calls = 0
    expect(await verifyFlagEntries(entries, 'flag{a}', ctx)).toEqual({
      matched: {
        index: 0,
        provider: 'test-counting',
        config: { flag: 'flag{a}' },
      },
      cheated: false,
    })
    expect(countingProvider.calls).toBe(3)
  })

  test("accepts another team's dynamic flag but reports it as cheated", async () => {
    const base = 'flag{abcdefghijklmnopqrstuvwxyz}'
    const dynamicConfig = { base, mode: DynamicFlagMode.TAIL }
    const entries: FlagEntry[] = [
      {
        provider: 'flags/dynamic',
        config: dynamicConfig,
      },
    ]
    const otherTeamFlag = await flagProviders['flags/dynamic']!.getForTeam(
      dynamicConfig,
      { ...ctx, teamId: teamB }
    )
    expect(otherTeamFlag).not.toBeNull()
    expect(await verifyFlagEntries(entries, otherTeamFlag!, ctx)).toEqual({
      matched: {
        index: 0,
        provider: 'flags/dynamic',
        config: dynamicConfig,
      },
      cheated: true,
      cheatedFrom: teamB,
    })
  })

  test('an accepted entry wins over a cheated one', async () => {
    const base = 'flag{abcdefghijklmnopqrstuvwxyz}'
    const dynamicConfig = { base, mode: DynamicFlagMode.TAIL }
    const otherTeamFlag = await flagProviders['flags/dynamic']!.getForTeam(
      dynamicConfig,
      { ...ctx, teamId: teamB }
    )
    expect(otherTeamFlag).not.toBeNull()
    const entries: FlagEntry[] = [
      {
        provider: 'flags/dynamic',
        config: dynamicConfig,
      },
      staticEntry(otherTeamFlag!),
    ]
    expect(await verifyFlagEntries(entries, otherTeamFlag!, ctx)).toEqual({
      matched: {
        index: 1,
        provider: 'flags/static',
        config: { flag: otherTeamFlag },
      },
      cheated: false,
    })
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
