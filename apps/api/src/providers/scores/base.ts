export interface ScoreContext {
  minPoints: number
  maxPoints: number

  solves: number
  maxSolves: number

  eventStartTime: number
  eventEndTime: number
  firstSolveTime: number | null // null = not solved yet
}

export type ScoreContextField = keyof ScoreContext

export interface ScoreProvider {
  readonly requiredFields: readonly ScoreContextField[]
  calculate: (context: ScoreContext) => number
}
