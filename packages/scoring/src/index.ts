import type { ScoreProvider } from './base'
import ClassicProvider from './classic'
import GenniProvider from './genni'
import JammyProvider from './jammy'
import LegacyProvider from './legacy'
import SekaiProvider from './sekai'
import SteepProvider from './steep'

export type { ScoreContext, ScoreContextField, ScoreProvider } from './base'
export { default as ClassicProvider } from './classic'
export { default as GenniProvider } from './genni'
export { default as JammyProvider } from './jammy'
export { default as LegacyProvider } from './legacy'
export { default as SekaiProvider } from './sekai'
export { default as SteepProvider } from './steep'

type ScoreProviderFactory = (options: unknown) => ScoreProvider

export const scoreProviders = {
  'scores/classic': (options: unknown) => new ClassicProvider(options),
  'scores/sekai': (options: unknown) => new SekaiProvider(options),
  'scores/steep': (options: unknown) => new SteepProvider(options),
  'scores/genni': (options: unknown) => new GenniProvider(options),
  'scores/legacy': (options: unknown) => new LegacyProvider(options),
  'scores/jammy': (options: unknown) =>
    new JammyProvider(
      (options ?? {}) as ConstructorParameters<typeof JammyProvider>[0]
    ),
} satisfies Record<string, ScoreProviderFactory>

export type ScoreProviderName = keyof typeof scoreProviders

export type ScoreProviderEntry = {
  name: ScoreProviderName
  create: ScoreProviderFactory
}

export function getScoreProviderEntries(): ScoreProviderEntry[] {
  return (Object.keys(scoreProviders) as ScoreProviderName[]).map(name => ({
    name,
    create: scoreProviders[name],
  }))
}
