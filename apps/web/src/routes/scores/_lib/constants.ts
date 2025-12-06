export const PAGE_SIZE = 10
export const FADE_SIZE = 48

// TODO(enscribe): Remove cutoff filter
export const CUTOFF_TIME = new Date('2025-10-28T03:00:00.000Z').getTime()

export const layout = {
  teamColumn: 680,
  cell: 48,
  gap: 4,
  padding: 16,
  nameRowHeight: 128,
  selfRowHeight: 80,
  headerHeight: 190,
  diagonal: {
    maxTextWidth: 150,
    charWidth: 9,
    angle: Math.PI / 4,
  },
} as const

export const MEDAL_COLORS = [
  'var(--foreground-gold-l0)',
  'var(--foreground-silver-l0)',
  'var(--foreground-bronze-l0)',
] as const

export const RANK_COLORS = [
  'var(--foreground-first)',
  'var(--foreground-second)',
  'var(--foreground-third)',
  'var(--foreground-fourth)',
  'var(--foreground-fifth)',
  'var(--foreground-sixth)',
  'var(--foreground-seventh)',
  'var(--foreground-eighth)',
  'var(--foreground-ninth)',
  'var(--foreground-tenth)',
] as const

export const SELF_COLOR = 'var(--foreground-self-l0)'
