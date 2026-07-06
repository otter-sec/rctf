export interface RankDeltaEntry {
  userId: string
  points: number
  pointDelta: number
}

export function computeRankDeltas(
  entries: RankDeltaEntry[]
): Map<string, number> {
  const withCurrent = entries.map((entry, currentIndex) => ({
    userId: entry.userId,
    currentIndex,
    previousPoints: entry.points - entry.pointDelta,
  }))

  const byPrevious = withCurrent
    .slice()
    .sort(
      (a, b) =>
        b.previousPoints - a.previousPoints || a.currentIndex - b.currentIndex
    )

  const deltas = new Map<string, number>()
  byPrevious.forEach((entry, previousIndex) => {
    deltas.set(entry.userId, previousIndex - entry.currentIndex)
  })
  return deltas
}
