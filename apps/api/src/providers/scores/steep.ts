import type { ScoreContext, ScoreContextField, ScoreProvider } from './base'

export default class SteepProvider implements ScoreProvider {
  readonly requiredFields: readonly ScoreContextField[] = [
    'minPoints',
    'maxPoints',
    'solves',
  ]

  constructor(_options: unknown) {}

  calculate(ctx: ScoreContext): number {
    const { minPoints, maxPoints, solves } = ctx
    const b = (x: number): number => 1 / (1 + Math.max(x - 1, 0) / 6)
    const f = (x: number): number => minPoints + (maxPoints - minPoints) * b(x)
    return Math.round(Math.max(Math.min(f(solves), maxPoints), minPoints))
  }
}
