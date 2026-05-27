export const PAGE_SIZE = 15
export const X_AXIS_DIVISIONS = 6
export const SPARKLINE_WINDOW = 60 * 60 * 1000 * 12 // 12 hours
export const DELTA_WINDOW = 60 * 60 * 1000 * 2 // 2 hours

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
