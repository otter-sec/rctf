import type { ScoreProvider } from './base'
import ClassicProvider from './classic'
import LegacyProvider from './legacy'

export const scoreProviders: Record<string, (options: any) => ScoreProvider> = {
  'scores/classic': (options: any) => new ClassicProvider(options),
  'scores/legacy': (options: any) => new LegacyProvider(options),
}
