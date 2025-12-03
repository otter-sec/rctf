import { getCategoryConfig, getCategoryOrder } from '$lib/utils/categories'
import { layout } from './constants'
import type {
  CategoryGroup,
  Challenge,
  ChallengesData,
  LeaderboardEntry,
  ViewMode,
} from './types'

export function getContentWidth(
  cells: { name: string }[],
  viewMode: ViewMode
): number {
  const { teamColumn, cell, gap, padding, diagonal } = layout

  if (cells.length === 0) return teamColumn + padding

  const lastLabel =
    viewMode === 'boomer'
      ? (cells.at(-1)?.name ?? '')
      : (cells.at(-1)?.name ?? '')

  const textWidth = Math.min(
    lastLabel.length * diagonal.charWidth,
    diagonal.maxTextWidth
  )
  const overflow = Math.max(
    0,
    Math.ceil(textWidth * Math.cos(diagonal.angle) - cell / 2)
  )

  return (
    teamColumn +
    cells.length * cell +
    (cells.length - 1) * gap +
    padding +
    overflow
  )
}

export function processChallenges(
  data: ChallengesData | undefined
): Challenge[] {
  if (!data) return []

  return Object.entries(data)
    .map(([id, info]) => ({
      id,
      ...info,
      order: getCategoryOrder(info.category),
      config: getCategoryConfig(info.category),
    }))
    .sort((a, b) => {
      if (a.order !== b.order) {
        if (a.order === -1 && b.order === -1)
          return a.category.localeCompare(b.category)
        if (a.order === -1) return 1
        if (b.order === -1) return -1
        return a.order - b.order
      }
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return b.points - a.points || a.name.localeCompare(b.name)
    })
}

export function groupByCategory(challenges: Challenge[]): CategoryGroup[] {
  return challenges.reduce<CategoryGroup[]>((groups, challenge) => {
    const last = groups.at(-1)
    if (last?.category === challenge.category) {
      last.challenges.push(challenge)
    } else {
      groups.push({
        category: challenge.category,
        config: challenge.config,
        challenges: [challenge],
      })
    }
    return groups
  }, [])
}

export function buildSolvesMap(entries: LeaderboardEntry[]) {
  return new Map(
    entries.map(e => [e.id, new Map(e.solves.map(s => [s.id, s]))])
  )
}
