import type { ScoreProvider } from './base'

export default class ClassicProvider implements ScoreProvider {
  constructor(_options: any) {}

  calculate(
    minPoints: number,
    maxPoints: number,
    maxSolves: number,
    solves: number
  ) {
    const b = (x: number): number =>
      1 / (1 + (Math.max(x - 1, 0) / 11.92201) ** 1.206069)
    const f = (x: number): number => minPoints + (maxPoints - minPoints) * b(x)
    return Math.round(Math.max(Math.min(f(solves), maxPoints), minPoints))
  }
}
