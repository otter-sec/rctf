import type { ScoreProvider } from './base'
import ClassicProvider from './classic'
import GenniProvider from './genni'
import LegacyProvider from './legacy'

export const scoreProviders: Record<string, (options: any) => ScoreProvider> = {
  'scores/classic': (options: any) => new ClassicProvider(options),
  'scores/legacy': (options: any) => new LegacyProvider(options),
  'scores/genni': (options: any) => new GenniProvider(options),
  // TODO(es3n1n): add the one we use for sekai, the steep one
}
