import type { ScoreContext, ScoreContextField, ScoreProvider } from './base'

interface JammyOptions {
  maximumScoreTime?: number
}

// Reference Python implementation:
// https://github.com/RealJammy/Jammy-Scoring
export default class JammyProvider implements ScoreProvider {
  readonly revision = '2'
  readonly requiredFields: readonly ScoreContextField[] = [
    'minPoints',
    'maxPoints',
    'eventStartTime',
    'eventEndTime',
    'firstSolveTime',
  ]

  private readonly maximumScoreTime: number

  constructor(options: JammyOptions = {}) {
    this.maximumScoreTime = options.maximumScoreTime ?? 0.8
  }

  calculate(ctx: ScoreContext): number {
    const {
      minPoints,
      maxPoints,
      eventStartTime,
      eventEndTime,
      firstSolveTime,
    } = ctx
    if (firstSolveTime === null) {
      return maxPoints
    }

    const eventLength = (eventEndTime - eventStartTime) / 1000
    const steps = maxPoints - minPoints + 1
    if (maxPoints === 0 || eventLength === 0 || steps <= 0) {
      return maxPoints
    }

    const tickrate = (this.maximumScoreTime * eventLength) / steps
    const timeSinceStart = (firstSolveTime - eventStartTime) / 1000
    const score = minPoints + Math.trunc(timeSinceStart / tickrate)
    return Math.min(score, maxPoints)
  }
}
