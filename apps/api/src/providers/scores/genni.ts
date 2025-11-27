import type { ScoreProvider } from './base'

export default class GenniProvider implements ScoreProvider {
  constructor(_options: any) {}

  calculate(
    minPoints: number,
    maxPoints: number,
    maxSolves: number,
    solves: number
  ) {
    return solves > 3 ? 0 : maxPoints;
  }
}
