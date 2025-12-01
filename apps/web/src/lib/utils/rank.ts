export type RankVariant = 'first' | 'second' | 'third' | 'self' | 'nth'

export interface RankStyles {
  bg: string
  fgL0: string
  fgL1: string
  gradient?: string
}

const rankStyleMap: Record<RankVariant, RankStyles> = {
  first: {
    bg: 'bg-background-first',
    fgL0: 'text-foreground-first-l0',
    fgL1: 'text-foreground-first-l1',
    gradient: 'after:from-foreground-first-l0/15',
  },
  second: {
    bg: 'bg-background-second',
    fgL0: 'text-foreground-second-l0',
    fgL1: 'text-foreground-second-l1',
    gradient: 'after:from-foreground-second-l0/15',
  },
  third: {
    bg: 'bg-background-third',
    fgL0: 'text-foreground-third-l0',
    fgL1: 'text-foreground-third-l1',
    gradient: 'after:from-foreground-third-l0/15',
  },
  self: {
    bg: 'bg-background-self',
    fgL0: 'text-foreground-self-l0',
    fgL1: 'text-foreground-self-l1',
  },
  nth: {
    bg: 'bg-background-nth',
    fgL0: 'text-foreground-nth-l0',
    fgL1: 'text-foreground-nth-l1',
  },
}

export function getRankVariant(
  rank: number,
  isCurrentUser: boolean
): RankVariant {
  if (rank === 1) return 'first'
  if (rank === 2) return 'second'
  if (rank === 3) return 'third'
  if (isCurrentUser) return 'self'
  return 'nth'
}

export function getRankStyles(variant: RankVariant): RankStyles {
  return rankStyleMap[variant]
}

export function getRankStylesForPosition(
  rank: number,
  isCurrentUser: boolean
): RankStyles {
  return getRankStyles(getRankVariant(rank, isCurrentUser))
}
