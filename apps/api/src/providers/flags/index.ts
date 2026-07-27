import type { FlagEntry } from '@rctf/db'
import type { FlagProvider } from './base'
import RegexFlagProvider from './regex'
import StaticFlagProvider, { staticFlagConfigSchema } from './static'

export const DEFAULT_FLAG_PROVIDER = 'flags/static'
export const flagProviders: Record<string, FlagProvider> = {
  'flags/static': new StaticFlagProvider(),
  'flags/regex': new RegexFlagProvider(),
}

export const resolveFlagProviderName = (entry: FlagEntry): string =>
  entry.provider ?? DEFAULT_FLAG_PROVIDER

export const getFlagProvider = (name: string): FlagProvider | undefined =>
  Object.hasOwn(flagProviders, name) ? flagProviders[name] : undefined

export interface MatchedFlagEntry {
  index: number
  provider: string
}

export const verifyFlagEntries = async (
  entries: FlagEntry[],
  submitted: string
): Promise<MatchedFlagEntry | null> => {
  let matched: MatchedFlagEntry | null = null

  // NOTE(es3n1n): Intentionally no short-circuit on the first match so that
  //  the response timing doesn't leak which entry matched
  for (const [index, entry] of entries.entries()) {
    const name = resolveFlagProviderName(entry)
    const provider = getFlagProvider(name)
    if (!provider) {
      continue
    }

    const ok = await provider.verify(entry.config, submitted)
    if (ok && matched === null) {
      matched = { index, provider: name }
    }
  }

  return matched
}

export const getFlagForTeam = async (
  entries: FlagEntry[] | undefined,
  team: string
): Promise<string> => {
  for (const entry of entries ?? []) {
    const provider = getFlagProvider(resolveFlagProviderName(entry))
    if (!provider) {
      continue
    }
    const flag = await provider.getForTeam(entry.config, team)
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

export const createDefaultFlag = (flag: string): FlagEntry => {
  return { provider: DEFAULT_FLAG_PROVIDER, config: { flag } }
}
