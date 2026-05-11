import type { Tooltip as TooltipPrimitive } from 'bits-ui'
import type { getCategoryConfig } from '$lib/utils/categories'

export interface ChallengeTooltipData {
  type: 'challenge'
  teamId: string
  challengeName: string
  points: number
  solved: boolean
  bloodIndex: number
  solveTime?: number
}

export interface CategoryTooltipData {
  type: 'category'
  teamId: string
  categoryName: string
  solved: number
  total: number
}

export type TooltipData = ChallengeTooltipData | CategoryTooltipData
export type ScoreCellTooltipTether = TooltipPrimitive.Tether<TooltipData>

export type ViewMode = 'challenges' | 'categories'
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

export interface TeamRowData {
  id: string
  name: string
  avatarUrl: string | null | undefined
  division: string
  divisionPlace: number | null
  countryCode: string | null | undefined
  statusText: string | null | undefined
  score: number
  solveCount: number
  rank: number
  isCurrentUser: boolean
  delta?: number
}
