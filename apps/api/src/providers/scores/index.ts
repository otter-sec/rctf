import type { ScoreProvider } from './base'
import ClassicProvider from './classic'
import GenniProvider from './genni'
import LegacyProvider from './legacy'
import SekaiProvider from './sekai'
import SteepProvider from './steep'

// https://www.desmos.com/calculator/wr8syh0fzs
// * C(x) = classic
// * G(x) = genni
// * S(x) = sekai
// * s(x) = steep
export const scoreProviders: Record<string, (options: any) => ScoreProvider> = {
  'scores/classic': (options: any) => new ClassicProvider(options),
  'scores/legacy': (options: any) => new LegacyProvider(options),
  'scores/genni': (options: any) => new GenniProvider(options),
  'scores/sekai': (options: any) => new SekaiProvider(options),
  'scores/steep': (options: any) => new SteepProvider(options),
}
