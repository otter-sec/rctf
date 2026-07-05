import { formatRelativeHoursMinutes } from '$lib/utils/time'

export type TooltipIcon =
  | { kind: 'solved' }
  | { kind: 'blood'; medal: 1 | 2 | 3 }

export interface TooltipLine {
  text: string
  trend?: 'positive' | 'negative' | 'neutral'
  // Rendered after `text`, followed by `iconLabel` (e.g. "50 pts ·" [icon] "Solved")
  icon?: TooltipIcon
  iconLabel?: string
}

export interface CellTooltip {
  title: string
  capitalize: boolean
  lines: TooltipLine[]
}

// The delegated listener hands us the hovered element's `dataset`; keeping this
// resolver pure (dataset in, content out) lets it be unit-tested without a DOM.
export type CellDataset = Partial<Record<string, string>>

// The data-kind contract shared with scores-solve-cells and scores-header:
// attribute writers and this resolver must agree on the same literal set.
export const CELL_KIND = {
  challenge: 'challenge',
  category: 'category',
  headerChallenge: 'header-challenge',
  headerCategory: 'header-category',
} as const

export type CellKind = (typeof CELL_KIND)[keyof typeof CELL_KIND]

const BLOOD_LABELS = ['First blood', 'Second blood', 'Third blood'] as const

// `startTime` (CTF start) anchors solve times as "+3h 24m" offsets, matching
// the graph axis and tooltips.
export function resolveCellTooltip(
  dataset: CellDataset,
  startTime: number
): CellTooltip | null {
  switch (dataset.kind) {
    case CELL_KIND.challenge:
      return resolveChallengeCell(dataset, startTime)
    case CELL_KIND.category:
      return resolveCategoryCell(dataset)
    case CELL_KIND.headerChallenge:
      return resolveHeaderChallenge(dataset)
    case CELL_KIND.headerCategory:
      return resolveHeaderCategory(dataset)
    default:
      return null
  }
}

function resolveChallengeCell(
  dataset: CellDataset,
  startTime: number
): CellTooltip | null {
  const title = dataset.name
  if (title === undefined) return null

  if (dataset.dynamic !== undefined) {
    const teamPoints = Number(dataset.teamPoints ?? 0)
    const pointDelta = Number(dataset.pointDelta ?? 0)
    return {
      title,
      capitalize: false,
      lines: [
        { text: `Current: ${teamPoints.toLocaleString()} pts` },
        {
          text: `Last update: ${formatPointDelta(pointDelta)}`,
          trend: pointDeltaTrend(pointDelta),
        },
      ],
    }
  }

  const bloodIndex = dataset.blood ? Number(dataset.blood) - 1 : -1
  const bloodLabel = BLOOD_LABELS[bloodIndex]
  const points = Number(dataset.points ?? 0)
  const lines: TooltipLine[] = []
  if (bloodLabel) {
    lines.push({
      text: `${points} pts ·`,
      icon: { kind: 'blood', medal: (bloodIndex + 1) as 1 | 2 | 3 },
      iconLabel: bloodLabel,
    })
  } else if (dataset.state === 'solved') {
    lines.push({
      text: `${points} pts ·`,
      icon: { kind: 'solved' },
      iconLabel: 'Solved',
    })
  } else {
    lines.push({ text: `${points} pts · Unsolved` })
  }
  if (dataset.solveTime) {
    lines.push({
      text: formatRelativeHoursMinutes(Number(dataset.solveTime), startTime),
    })
  }
  return { title, capitalize: false, lines }
}

function resolveCategoryCell(dataset: CellDataset): CellTooltip | null {
  const title = dataset.name
  if (title === undefined) return null
  const total = Number(dataset.total ?? 0)
  const text =
    total === 0
      ? 'Dynamic scoring'
      : `${Number(dataset.solved ?? 0)} / ${total} solved`
  return { title, capitalize: true, lines: [{ text }] }
}

function resolveHeaderChallenge(dataset: CellDataset): CellTooltip | null {
  const title = dataset.name
  if (title === undefined) return null
  const text =
    dataset.dynamic !== undefined
      ? 'Dynamic scoring'
      : `${Number(dataset.points ?? 0)} pts`
  return { title, capitalize: false, lines: [{ text }] }
}

function resolveHeaderCategory(dataset: CellDataset): CellTooltip | null {
  const title = dataset.name
  if (title === undefined) return null
  const count = Number(dataset.count ?? 0)
  const points = Number(dataset.points ?? 0)
  const dynamicCount = Number(dataset.dynamicCount ?? 0)
  const noun = count === 1 ? 'challenge' : 'challenges'
  const suffix = dynamicCount > 0 ? ` (+ ${dynamicCount} dynamic)` : ''
  return {
    title,
    capitalize: true,
    lines: [{ text: `${count} ${noun} · ${points} pts${suffix}` }],
  }
}

function formatPointDelta(delta: number): string {
  const value = Math.abs(delta).toLocaleString()
  if (delta > 0) return `+${value} pts`
  if (delta < 0) return `-${value} pts`
  return '0 pts'
}

function pointDeltaTrend(delta: number): TooltipLine['trend'] {
  if (delta > 0) return 'positive'
  if (delta < 0) return 'negative'
  return 'neutral'
}
