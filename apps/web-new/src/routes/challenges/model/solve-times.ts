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

export function rankVariant(rank: number, isSelf: boolean): RankVariant {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  if (isSelf) return 'self'
  return 'nth'
}

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
