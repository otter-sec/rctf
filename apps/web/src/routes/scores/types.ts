import type { getCategoryConfig } from '$lib/utils/categories'

export interface TooltipData {
  teamId: string
  challengeName: string
  points: number
  solved: boolean
  bloodIndex: number
  solveTime?: number
}

export type ViewMode = 'challenges' | 'categories' | 'minimal'
export type SortMode = 'categories' | 'solves'

export interface ChallengeInfo {
  id: string
  name: string
  category: string
  points: number
  solves: number
  order: number
  config: ReturnType<typeof getCategoryConfig>
}

export interface CategoryGroup {
  category: string
  config: ReturnType<typeof getCategoryConfig>
  challenges: ChallengeInfo[]
}
