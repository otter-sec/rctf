export interface RankDeltaEntry {
  userId: string
  points: number
  pointDelta: number
}

/**
 * Re-ranks all loaded score entries by their previous points (points minus the
 * latest pointDelta) and reports, per user, how many places they moved between
 * that previous ranking and the current one. A positive delta means the entry
 * climbed (it sat lower in the previous ranking); negative means it dropped.
 *
 * Entries must arrive in current-rank order (index 0 = rank 1). Ties in previous
 * points keep the entries in their current relative order, so the result is
 * deterministic. Every entry is present in the returned map, including those
 * that did not move (delta 0).
 *
 * CAVEAT (M5): the ranking is computed over exactly the entries passed in — the
 * pages loaded so far. A team that belongs between two loaded pages is not
 * accounted for, so deltas near a page boundary can be wrong until more pages
 * load. The old app carried the same limitation.
 *
 * @param entries - Loaded score entries in current-rank order.
 */
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
