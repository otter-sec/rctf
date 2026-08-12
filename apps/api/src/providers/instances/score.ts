import { config } from '@rctf/config'
import { scoreProviders, type ScoreProvider } from '@rctf/scoring'
import { loadProvider } from './load'

export const scoreProvider = loadProvider<ScoreProvider>(
  scoreProviders,
  config.scoreProvider
)!
