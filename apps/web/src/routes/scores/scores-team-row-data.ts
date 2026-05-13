import type { CurrentUserScoreData, ScoreEntry, ScoreGraphPoint } from './types'

export interface ScoresTeamRowData {
  id: string
  rank: number | null
  globalRank?: number | null
  name: string
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  score: number
  solveCount: number
  delta?: number
  sparklineData?: ScoreGraphPoint[]
  isCurrentUser: boolean
  divisionPlace?: number | null
  divisionName?: string | null
  color?: string
}

interface TeamRowDataConfig {
  entry: ScoreEntry
  rowIndex: number
  search: string | undefined
  focusedChallengeId: string | null
  originalRankByTeam: Map<string, number>
  rankDeltaByTeam: Map<string, number>
  sparklineDataByTeam: Map<string, ScoreGraphPoint[]>
  currentUser: CurrentUserScoreData | null | undefined
  teamColorMap: Map<string, string>
  showDivision: boolean
  divisions: Record<string, string>
}

interface SelfTeamRowDataConfig {
  currentUser: CurrentUserScoreData
  rankDeltaByTeam: Map<string, number>
  sparklineDataByTeam: Map<string, ScoreGraphPoint[]>
  teamColorMap: Map<string, string>
  showDivision: boolean
  divisions: Record<string, string>
}

export function getTeamRowData(config: TeamRowDataConfig): ScoresTeamRowData {
  const { entry } = config
  return {
    id: entry.id,
    rank: getDisplayRank(config),
    globalRank: entry.globalPlace,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    countryCode: entry.countryCode,
    statusText: entry.statusText,
    score: entry.score,
    solveCount: entry.solves.length,
    delta: config.rankDeltaByTeam.get(entry.id),
    sparklineData: config.sparklineDataByTeam.get(entry.id),
    isCurrentUser: config.currentUser?.id === entry.id,
    color: config.teamColorMap.get(entry.id),
    divisionPlace: config.showDivision ? entry.divisionPlace : undefined,
    divisionName: config.showDivision ? config.divisions[entry.division] : undefined,
  }
}

export function getSelfTeamRowData(config: SelfTeamRowDataConfig): ScoresTeamRowData {
  const { currentUser } = config
  return {
    id: currentUser.id,
    rank: currentUser.globalPlace ?? null,
    globalRank: currentUser.globalPlace ?? undefined,
    name: currentUser.name,
    avatarUrl: currentUser.avatarUrl,
    countryCode: currentUser.countryCode,
    statusText: currentUser.statusText,
    score: currentUser.score,
    solveCount: currentUser.solves.length,
    delta: config.rankDeltaByTeam.get(currentUser.id),
    sparklineData: config.sparklineDataByTeam.get(currentUser.id),
    isCurrentUser: true,
    color: config.teamColorMap.get(currentUser.id),
    divisionPlace: config.showDivision ? currentUser.divisionPlace : undefined,
    divisionName:
      config.showDivision && currentUser.division
        ? config.divisions[currentUser.division]
        : undefined,
  }
}

export function getSelfSolves(currentUser: CurrentUserScoreData): Set<string> {
  return new Set(currentUser.solves.map(solve => solve.id))
}

export function getSelfSolveTimes(currentUser: CurrentUserScoreData): Map<string, number> {
  return new Map(currentUser.solves.map(solve => [solve.id, solve.createdAt]))
}

function getDisplayRank(config: TeamRowDataConfig): number {
  if (!config.search && config.focusedChallengeId) {
    return config.originalRankByTeam.get(config.entry.id) ?? config.rowIndex + 1
  }
  return config.entry.globalPlace ?? config.rowIndex + 1
}
