import {
  formatFirstBloodTime,
  formatLocalTime,
  formatRelativeToFirstBlood,
} from '$lib/utils/time'

export type RankVariant = 'gold' | 'silver' | 'bronze' | 'self' | 'nth'

export interface SolveTimeInput {
  createdAt: number
  rank: number
  ctfStartTime: number
  firstBloodTime: number
}

export interface SolveTimeLabels {
  primary: string
  secondary: string
}

/**
 * Maps a rank position to its row styling variant.
 *
 * Ranks 1-3 always take the medal treatment, even for the current user; the
 * self tint only applies below the podium. Shared by the solves and scores
 * rows, so the mapping is keyed on rank rather than on any solve-specific field.
 *
 * @param rank - One-based rank position.
 * @param isSelf - Whether the row belongs to the current user.
 */
export function rankVariant(rank: number, isSelf: boolean): RankVariant {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  if (isSelf) return 'self'
  return 'nth'
}

/**
 * Builds the two-line time label for a solve row.
 *
 * The first solver's primary line is the duration from CTF start; every later
 * solver's is a `+delta` from first blood. When the first-blood anchor is
 * missing (its row lives on a page that has not loaded yet), later solvers fall
 * back to the absolute duration from CTF start rather than an anchorless '+'.
 * The secondary line is always the local wall-clock time of the solve.
 */
export function solveTimeLabels({
  createdAt,
  rank,
  ctfStartTime,
  firstBloodTime,
}: SolveTimeInput): SolveTimeLabels {
  const secondary = formatLocalTime(createdAt)
  if (rank === 1 || !firstBloodTime) {
    return { primary: formatFirstBloodTime(createdAt, ctfStartTime), secondary }
  }
  return {
    primary: formatRelativeToFirstBlood(createdAt, firstBloodTime),
    secondary,
  }
}
