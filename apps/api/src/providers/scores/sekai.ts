import type { ScoreProvider } from './base'

export default class SekaiProvider implements ScoreProvider {
  constructor(_options: any) {}

  calculate(
    minPoints: number,
    maxPoints: number,
    maxSolves: number,
    solves: number
  ) {
    const gradient = 10
    const decay = 70

    const min = 1 + (gradient - 1) / decay
    const x = 1 + ((gradient - 1) / decay) * solves
    const ratio = Math.log(x / min) / Math.log(gradient / min)
    const rawScore = Math.ceil(maxPoints - (maxPoints - minPoints) * ratio)
    return Math.max(minPoints, Math.min(maxPoints, rawScore))
  }
}
