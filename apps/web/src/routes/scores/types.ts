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

export interface ScoreSolve {
  id: string
  solveTime: number
}

export interface CurrentUserSolve {
  id: string
  createdAt: number
}

export interface ScoreEntry {
  id: string
  name: string
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  score: number
  solves: ScoreSolve[]
  globalPlace: number | null
  division: string
  divisionPlace: number | null
}

export interface CurrentUserScoreData {
  id: string
  name: string
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  score: number
  solves: CurrentUserSolve[]
  globalPlace: number | null
  division: string | null | undefined
  divisionPlace: number | null
}

export interface ScoreGraphPoint {
  time: number
  score: number
}

export interface ScoreGraphEntry {
  id: string
  name: string
  points: ScoreGraphPoint[]
}

export interface ScreenshotTeamEntry {
  id: string
  rank: number
  name: string
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  score: number
  solveCount: number
  isCurrentUser: boolean
  color?: string
  sparklineData?: ScoreGraphPoint[]
}

export interface GraphVisibility {
  visibleTeamIds: Set<string>
  contextTeamIds: Set<string>
}

export interface ViewportVisibility {
  minRank: number
  maxRank: number
  userVisible: boolean
  userClippedTop: boolean
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
