import { getVisibleSolveCount } from './scores-leaderboard-data-transforms'
import type {
  CurrentUserScoreData,
  ScoreEntry,
  ScoreGraphPoint,
} from './scores-shared-types'

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

interface SharedRowConfig {
  rankDeltaByTeam: Map<string, number>
  sparklineDataByTeam: Map<string, ScoreGraphPoint[]>
  teamColorMap: Map<string, string>
  showDivision: boolean
  divisions: Record<string, string>
}

interface TeamRowDataConfig extends SharedRowConfig {
  entry: ScoreEntry
  rowIndex: number
  search: string | undefined
  focusedChallengeId: string | null
  originalRankByTeam: Map<string, number>
  currentUser: CurrentUserScoreData | null | undefined
  challengesData: Record<string, { scoringKind?: 'decay' | 'dynamic' }>
}

interface SelfTeamRowDataConfig extends SharedRowConfig {
  currentUser: CurrentUserScoreData
  challengesData: Record<string, { scoringKind?: 'decay' | 'dynamic' }>
}

interface RowSource {
  id: string
  name: string
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  score: number
  solveCount: number
  globalPlace: number | null
  division: string | null | undefined
  divisionPlace: number | null
}

export function getTeamRowData(config: TeamRowDataConfig): ScoresTeamRowData {
  const { entry } = config
  return buildRowData(
    {
      ...entry,
      solveCount: getVisibleSolveCount(entry.solves, config.challengesData),
    },
    {
      rank: getDisplayRank(entry, config),
      isCurrentUser: config.currentUser?.id === entry.id,
      shared: config,
    }
  )
}

export function getSelfTeamRowData(
  config: SelfTeamRowDataConfig
): ScoresTeamRowData {
  const { currentUser } = config
  return buildRowData(
    {
      ...currentUser,
      solveCount: getVisibleSolveCount(
        currentUser.solves,
        config.challengesData
      ),
    },
    {
      rank: currentUser.globalPlace ?? null,
      isCurrentUser: true,
      shared: config,
    }
  )
}

export function getSelfSolves(currentUser: CurrentUserScoreData): Set<string> {
  return new Set(currentUser.solves.map(solve => solve.id))
}

export function getSelfSolveTimes(
  currentUser: CurrentUserScoreData
): Map<string, number> {
  return new Map(currentUser.solves.map(solve => [solve.id, solve.createdAt]))
}

export function getSelfChallengePoints(
  currentUser: CurrentUserScoreData
): Map<string, number> {
  return new Map(
    currentUser.dynamicScores.map((score): [string, number] => [
      score.id,
      score.points,
    ])
  )
}

export function getSelfChallengePointDeltas(
  currentUser: CurrentUserScoreData
): Map<string, number> {
  return new Map(
    currentUser.dynamicScores.map((score): [string, number] => [
      score.id,
      score.pointDelta,
    ])
  )
}

function buildRowData(
  source: RowSource,
  opts: { rank: number | null; isCurrentUser: boolean; shared: SharedRowConfig }
): ScoresTeamRowData {
  const { shared } = opts
  return {
    id: source.id,
    rank: opts.rank,
    globalRank: source.globalPlace,
    name: source.name,
    avatarUrl: source.avatarUrl,
    countryCode: source.countryCode,
    statusText: source.statusText,
    score: source.score,
    solveCount: source.solveCount,
    delta: shared.rankDeltaByTeam.get(source.id),
    sparklineData: shared.sparklineDataByTeam.get(source.id),
    isCurrentUser: opts.isCurrentUser,
    color: shared.teamColorMap.get(source.id),
    divisionPlace: shared.showDivision ? source.divisionPlace : undefined,
    divisionName:
      shared.showDivision && source.division
        ? shared.divisions[source.division]
        : undefined,
  }
}

function getDisplayRank(entry: ScoreEntry, config: TeamRowDataConfig): number {
  if (!config.search && config.focusedChallengeId) {
    return config.originalRankByTeam.get(entry.id) ?? config.rowIndex + 1
  }
  return entry.globalPlace ?? config.rowIndex + 1
}
