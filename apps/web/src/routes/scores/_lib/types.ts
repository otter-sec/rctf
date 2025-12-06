import type { getCategoryConfig } from '$lib/utils/categories'

export type SortMode = 'category' | 'solves'
export type ViewMode = 'zoomer' | 'boomer' | 'minimal'

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
  teamId: string
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
  division: string
  divisionPlace: number
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
