import type { ScoreContext, ScoreContextField, ScoreProvider } from './base'

export default class SekaiProvider implements ScoreProvider {
  readonly requiredFields: readonly ScoreContextField[] = [
    'minPoints',
    'maxPoints',
    'solves',
  ]

  constructor(_options: unknown) {}

  calculate(ctx: ScoreContext): number {
    const { minPoints, maxPoints, solves } = ctx
    const gradient = 10
    const decay = 60

    const min = 1 + (gradient - 1) / decay
    const x = 1 + ((gradient - 1) / decay) * solves
    const ratio = Math.log(x / min) / Math.log(gradient / min)
    const rawScore = Math.ceil(maxPoints - (maxPoints - minPoints) * ratio)
    return Math.max(minPoints, Math.min(maxPoints, rawScore))
  }
}
