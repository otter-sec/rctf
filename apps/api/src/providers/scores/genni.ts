import type { ScoreContext, ScoreContextField, ScoreProvider } from './base'

export default class GenniProvider implements ScoreProvider {
  readonly revision = '1'
  readonly requiredFields: readonly ScoreContextField[] = [
    'minPoints',
    'maxPoints',
    'solves',
  ]

  constructor(_options: unknown) {}

  calculate(ctx: ScoreContext): number {
    const { maxPoints, solves } = ctx
    return solves > 2 ? 0 : maxPoints
  }
}
