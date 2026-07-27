import type { FlagEntry } from '@rctf/db'
import type { FlagProvider, FlagTeamContext } from './base'
import { FlagVerifyStatus } from './base'
import DynamicFlagProvider from './dynamic'
import RegexFlagProvider from './regex'
import StaticFlagProvider, { staticFlagConfigSchema } from './static'

export const DEFAULT_FLAG_PROVIDER = 'flags/static'
export const flagProviders: Record<string, FlagProvider> = {
  'flags/static': new StaticFlagProvider(),
  'flags/regex': new RegexFlagProvider(),
  'flags/dynamic': new DynamicFlagProvider(),
}

export const resolveFlagProviderName = (entry: FlagEntry): string =>
  entry.provider ?? DEFAULT_FLAG_PROVIDER

export const getFlagProvider = (name: string): FlagProvider | undefined =>
  Object.hasOwn(flagProviders, name) ? flagProviders[name] : undefined

export interface MatchedFlagEntry {
  index: number
  provider: string
  config: FlagEntry['config']
}

export interface FlagEntriesVerification {
  matched: MatchedFlagEntry | null
  cheated: boolean
}

export const verifyFlagEntries = async (
  entries: FlagEntry[],
  submitted: string,
  context: FlagTeamContext
): Promise<FlagEntriesVerification> => {
  let accepted: MatchedFlagEntry | null = null
  let cheated: MatchedFlagEntry | null = null

  // NOTE(es3n1n): Intentionally no short-circuit on the first match so that
  //  the response timing doesn't leak which entry matched
  for (const [index, entry] of entries.entries()) {
    const name = resolveFlagProviderName(entry)
    const provider = getFlagProvider(name)
    if (!provider) {
      continue
    }

    const result = await provider.verify(entry.config, submitted, context)
    if (result.status === FlagVerifyStatus.ACCEPTED && accepted === null) {
      accepted = { index, provider: name, config: entry.config }
    }
    if (result.status === FlagVerifyStatus.CHEATED && cheated === null) {
      cheated = { index, provider: name, config: entry.config }
    }
  }

  return accepted !== null
    ? { matched: accepted, cheated: false }
    : { matched: cheated, cheated: cheated !== null }
}

export const getFlagForTeam = async (
  entries: FlagEntry[] | undefined,
  context: FlagTeamContext
): Promise<string> => {
  for (const entry of entries ?? []) {
    const provider = getFlagProvider(resolveFlagProviderName(entry))
    if (!provider) {
      continue
    }
    const flag = await provider.getForTeam(entry.config, context)
    if (flag !== null) {
      return flag
    }
  }
  return ''
}

export const getFirstDefaultFlag = (
  entries: FlagEntry[] | undefined
): string => {
  for (const entry of entries ?? []) {
    if (resolveFlagProviderName(entry) !== DEFAULT_FLAG_PROVIDER) {
      continue
    }
    const parsed = staticFlagConfigSchema.safeParse(entry.config)
    if (parsed.success) {
      return parsed.data.flag
    }
  }
  return ''
}

export const createDefaultFlag = (flag: string) => {
  return { provider: DEFAULT_FLAG_PROVIDER, config: { flag } }
}
