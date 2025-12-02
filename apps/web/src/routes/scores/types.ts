import type { getCategoryConfig } from '$lib/utils/categories'

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
  solves: {
    id: string
    solveTime: number
  }[]
  avatarUrl?: string | null
}

export const PAGE_SIZE = 10
export const TEAM_COL_WIDTH = 548
export const CELL_WIDTH = 48
export const NAME_ROW_HEIGHT = 128
export const HEADER_HEIGHT = 190
export const FADE_SIZE = 48
