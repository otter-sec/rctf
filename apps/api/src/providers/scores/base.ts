export interface ScoreProvider {
  calculate: (
    minPoints: number,
    maxPoints: number,
    maxSolves: number,
    solves: number
  ) => number
}
