import { getCategoryConfig, getCategoryOrder } from '$lib/utils/categories'

export type SortMode = 'category' | 'solves'
export type ViewMode = 'zoomer' | 'boomer'

export interface Challenge {
  id: string
  name: string
  category: string
  points: number
  solves: number
  order: number
  config: ReturnType<typeof getCategoryConfig>
  firstSolvers?: Array<{ id: string }>
}

export interface TooltipData {
  challengeName: string
  points: number
  solved: boolean
  bloodIndex: number
  solveTime?: number
}

export interface CategoryGroup {
  category: string
  config: ReturnType<typeof getCategoryConfig>
  challenges: Challenge[]
}

export interface LeaderboardEntry {
  id: string
  name: string
  score: number
  solves: { id: string; solveTime: number }[]
  avatarUrl?: string | null
}

export type ChallengesData = Record<
  string,
  {
    name: string
    category: string
    points: number
    solves: number
    firstSolvers?: { id: string }[]
  }
>

export const PAGE_SIZE = 10
export const TEAM_COL_WIDTH = 548
export const CELL_WIDTH = 48
export const NAME_ROW_HEIGHT = 128
export const HEADER_HEIGHT = 190
export const FADE_SIZE = 48

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
