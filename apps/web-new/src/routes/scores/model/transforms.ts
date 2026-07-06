import {
  getCategoryConfig,
  getCategoryKeyOrAlias,
  getScoreboardCategoryOrder,
  type CategoryConfig,
} from '$lib/utils/categories'
import {
  DELTA_WINDOW,
  MEDAL_COLORS,
  PAGE_SIZE,
  RANK_COLORS,
  SCORE_CELL_WIDTH_PX,
  SCORE_DYNAMIC_CELL_WIDTH_PX,
  SCORE_ROW_GAP_PX,
  SELF_COLOR,
  SPARKLINE_WINDOW,
} from '../leaderboard/constants'

export interface ChallengeSource {
  name: string
  category: string
  points: number
  solves: number
  scoringKind: 'decay' | 'dynamic'
  firstSolvers: { id: string }[]
}

export interface ChallengeInfo {
  id: string
  name: string
  category: string
  points: number
  solves: number
  scoringKind: 'decay' | 'dynamic'
  order: number
  config: CategoryConfig
}

export interface CategoryGroup {
  category: string
  config: CategoryConfig
  challenges: ChallengeInfo[]
}

export interface CategoryStats {
  solved: number
  total: number
  percent: number
  state: 'full' | 'partial' | 'none' | 'all-dynamic'
}

export interface TeamSolvesEntry {
  id: string
  solves: { id: string; solveTime: number }[]
  dynamicScores: { id: string; points: number; pointDelta: number }[]
}

export interface TeamSolveLookups {
  solvedIds: Set<string>
  solveTimes: Map<string, number>
  dynamicPoints: Map<string, number>
  dynamicPointDeltas: Map<string, number>
}

export interface GraphPoint {
  time: number
  score: number
}

export interface GraphSeries {
  id: string
  points: GraphPoint[]
}

export interface GraphVisibility {
  visibleTeamIds: Set<string>
  contextTeamIds: Set<string>
}

export interface GraphVisibilityConfig {
  entries: { id: string }[]
  isLoading: boolean
  minRank: number
  maxRank: number
  showTop3Context: boolean
  showSelfContext: boolean
  currentUserId: string | null
  teamRanks: Map<string, number>
}

type ScoringKind = { scoringKind: 'decay' | 'dynamic' }

export function getChallengesByCategory(
  challengesData: Record<string, ChallengeSource>
): ChallengeInfo[] {
  return Object.entries(challengesData)
    .map(([id, info]) => ({
      id,
      ...info,
      order: getScoreboardCategoryOrder(info.category),
      config: getCategoryConfig(info.category),
    }))
    .filter(challenge => getCategoryKeyOrAlias(challenge.category) !== 'sanity')
    .sort(compareChallengesByCategory)
}

export function getChallengesBySolves(
  challenges: ChallengeInfo[]
): ChallengeInfo[] {
  return [...challenges].sort(
    (a, b) => a.solves - b.solves || a.name.localeCompare(b.name)
  )
}

export function isDynamicChallenge(challenge: ScoringKind): boolean {
  return challenge.scoringKind === 'dynamic'
}

export function getChallengeCellWidth(challenge: ScoringKind): number {
  return isDynamicChallenge(challenge)
    ? SCORE_DYNAMIC_CELL_WIDTH_PX
    : SCORE_CELL_WIDTH_PX
}

export function getChallengeCellsWidth(
  challenges: readonly ScoringKind[]
): number {
  let width = 0
  for (const challenge of challenges) {
    width += getChallengeCellWidth(challenge) + SCORE_ROW_GAP_PX
  }
  return width
}

export function getChallengeCellsInnerWidth(
  challenges: readonly ScoringKind[]
): number {
  const width = getChallengeCellsWidth(challenges)
  return width === 0 ? 0 : width - SCORE_ROW_GAP_PX
}

export function getCategoryCellsInnerWidth(count: number): number {
  if (count <= 0) return 0
  return count * SCORE_CELL_WIDTH_PX + (count - 1) * SCORE_ROW_GAP_PX
}

export type RankVariant = 'first' | 'second' | 'third' | 'self' | 'nth'

export function getRankVariant(
  rank: number,
  isCurrentUser: boolean
): RankVariant {
  if (rank === 1) return 'first'
  if (rank === 2) return 'second'
  if (rank === 3) return 'third'
  if (isCurrentUser) return 'self'
  return 'nth'
}

export function getVisibleSolveCount(
  solves: readonly { id: string }[],
  challengesData: Record<string, { scoringKind?: 'decay' | 'dynamic' }>
): number {
  let count = 0
  for (const solve of solves) {
    if (challengesData[solve.id]?.scoringKind !== 'dynamic') count += 1
  }
  return count
}

export function getCategoryGroups(
  challenges: ChallengeInfo[]
): CategoryGroup[] {
  const groups: CategoryGroup[] = []
  for (const challenge of challenges) {
    const last = groups.at(-1)
    if (last?.category === challenge.category) {
      last.challenges.push(challenge)
      continue
    }
    groups.push({
      category: challenge.category,
      config: challenge.config,
      challenges: [challenge],
    })
  }
  return groups
}

export function getTeamSolveLookups(entry: TeamSolvesEntry): TeamSolveLookups {
  const solvedIds = new Set<string>()
  const solveTimes = new Map<string, number>()
  const dynamicPoints = new Map<string, number>()
  const dynamicPointDeltas = new Map<string, number>()
  for (const solve of entry.solves) {
    solvedIds.add(solve.id)
    solveTimes.set(solve.id, solve.solveTime)
  }
  for (const score of entry.dynamicScores) {
    dynamicPoints.set(score.id, score.points)
    dynamicPointDeltas.set(score.id, score.pointDelta)
  }
  return { solvedIds, solveTimes, dynamicPoints, dynamicPointDeltas }
}

export function getBloodIndex(
  challengesData: Record<string, { firstSolvers: { id: string }[] }>,
  challengeId: string,
  teamId: string
): number {
  const challenge = challengesData[challengeId]
  if (!challenge) return -1
  return challenge.firstSolvers.findIndex(solver => solver.id === teamId)
}

export function getCategoryStatsForSolves(
  solves: Set<string> | null,
  group: CategoryGroup
): CategoryStats {
  const scored = group.challenges.filter(
    challenge => !isDynamicChallenge(challenge)
  )
  const total = scored.length
  if (total === 0) {
    const state = group.challenges.length > 0 ? 'all-dynamic' : 'none'
    return { solved: 0, total: 0, percent: 0, state }
  }
  const solved = solves
    ? scored.filter(challenge => solves.has(challenge.id)).length
    : 0
  return {
    solved,
    total,
    percent: (solved / total) * 100,
    state: solved === 0 ? 'none' : solved === total ? 'full' : 'partial',
  }
}

export type RankTier = 'self' | 'gold' | 'silver' | 'bronze' | `r${number}`

export function getRankTier(
  isSelf: boolean,
  rank: number | null | undefined,
  fallbackId: string
): RankTier {
  if (isSelf) return 'self'
  if (rank !== null && rank !== undefined && rank > 0) {
    if (rank === 1) return 'gold'
    if (rank === 2) return 'silver'
    if (rank === 3) return 'bronze'
    return `r${((rank - 1) % RANK_COLORS.length) + 1}`
  }
  const hash = fallbackId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return `r${(hash % RANK_COLORS.length) + 1}`
}

const TIER_COLORS: Record<string, string> = {
  self: SELF_COLOR,
  gold: MEDAL_COLORS[0],
  silver: MEDAL_COLORS[1],
  bronze: MEDAL_COLORS[2],
}

export function getRankColorForPosition(
  rank: number | null | undefined,
  isCurrentUser: boolean,
  fallbackId: string
): string {
  return tierColor(getRankTier(isCurrentUser, rank, fallbackId))
}

function tierColor(tier: RankTier): string {
  return TIER_COLORS[tier] ?? RANK_COLORS[Number(tier.slice(1)) - 1]!
}

export function getTeamColorMap(
  entries: { id: string; globalPlace: number | null }[],
  currentUser: { id: string } | null | undefined
): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of entries) {
    map.set(
      entry.id,
      getRankColorForPosition(
        entry.globalPlace,
        currentUser?.id === entry.id,
        entry.id
      )
    )
  }
  if (currentUser) map.set(currentUser.id, SELF_COLOR)
  return map
}

export function getTeamRanks(entries: { id: string }[]): Map<string, number> {
  return new Map(entries.map((entry, index) => [entry.id, index + 1]))
}

export function mergeWithSelfGraph<T extends { id: string }>(
  data: T[],
  selfData: T | null | undefined
): T[] {
  return selfData && !data.some(team => team.id === selfData.id)
    ? [...data, selfData]
    : data
}

export function getSparklineDataByTeam(
  allGraphData: GraphSeries[],
  selfGraphData: GraphSeries | null | undefined
): Map<string, GraphPoint[]> {
  const allTeams = mergeWithSelfGraph(allGraphData, selfGraphData)
  let maxTime = 0
  for (const team of allTeams) {
    for (const point of team.points) {
      if (point.time > maxTime) maxTime = point.time
    }
  }
  const windowStart = maxTime - SPARKLINE_WINDOW
  const map = new Map<string, GraphPoint[]>()
  for (const team of allTeams) {
    let carry: GraphPoint | null = null
    const windowed: GraphPoint[] = []
    for (const point of team.points) {
      if (point.time < windowStart) {
        if (!carry || point.time > carry.time) carry = point
      } else {
        windowed.push(point)
      }
    }
    if (windowed.length >= 2) {
      map.set(team.id, windowed)
      continue
    }
    const points: GraphPoint[] = carry
      ? [{ time: windowStart, score: carry.score }, ...windowed]
      : windowed
    const last = points.at(-1)
    if (last && last.time < maxTime)
      points.push({ time: maxTime, score: last.score })
    map.set(team.id, points)
  }
  return map
}

export function getRankDeltaByTeam(
  search: string | undefined,
  allGraphData: GraphSeries[],
  selfGraphData: GraphSeries | null | undefined
): Map<string, number> {
  if (search) return new Map()

  let currentTime = -Infinity
  for (const team of allGraphData) {
    for (const point of team.points) {
      if (point.time > currentTime) currentTime = point.time
    }
  }
  if (currentTime === -Infinity) return new Map()

  const pastTime = currentTime - DELTA_WINDOW
  const allTeams = mergeWithSelfGraph(allGraphData, selfGraphData)
  const teamsWithScores = allTeams.map(team =>
    getScoresAt(team, currentTime, pastTime)
  )
  const currentRankMap = getRanks(teamsWithScores, 'currentScore')
  const pastRankMap = getRanks(teamsWithScores, 'pastScore')

  const deltas = new Map<string, number>()
  for (const team of teamsWithScores) {
    const delta =
      (pastRankMap.get(team.id) ?? 0) - (currentRankMap.get(team.id) ?? 0)
    if (delta !== 0) deltas.set(team.id, delta)
  }
  return deltas
}

export function getEmptyGraphVisibility(): GraphVisibility {
  return { visibleTeamIds: new Set(), contextTeamIds: new Set() }
}

export function getGraphVisibility(
  config: GraphVisibilityConfig
): GraphVisibility {
  if (config.isLoading || config.entries.length === 0) {
    return getEmptyGraphVisibility()
  }

  const visibleTeamIds = new Set<string>()
  const contextTeamIds = new Set<string>()
  addViewportTeams(config, visibleTeamIds, contextTeamIds)

  if (config.currentUserId && config.showSelfContext) {
    const selfRank = config.teamRanks.get(config.currentUserId)
    const selfInTop3 = selfRank !== undefined && selfRank <= 3
    if (!selfInTop3 || config.showTop3Context) {
      visibleTeamIds.add(config.currentUserId)
    }
  }

  return { visibleTeamIds, contextTeamIds }
}

function compareChallengesByCategory(
  a: ChallengeInfo,
  b: ChallengeInfo
): number {
  if (a.order !== b.order) {
    if (a.order === -1 && b.order === -1)
      return a.category.localeCompare(b.category)
    if (a.order === -1) return 1
    if (b.order === -1) return -1
    return a.order - b.order
  }
  if (a.category !== b.category) return a.category.localeCompare(b.category)
  return b.points - a.points || a.name.localeCompare(b.name)
}

function getScoresAt(
  team: GraphSeries,
  currentTime: number,
  pastTime: number
): { id: string; currentScore: number; pastScore: number } {
  let currentLatest = -Infinity
  let currentScore = 0
  let pastLatest = -Infinity
  let pastScore = 0
  for (const point of team.points) {
    if (point.time <= currentTime && point.time > currentLatest) {
      currentLatest = point.time
      currentScore = point.score
    }
    if (point.time <= pastTime && point.time > pastLatest) {
      pastLatest = point.time
      pastScore = point.score
    }
  }
  return { id: team.id, currentScore, pastScore }
}

function getRanks<
  T extends { id: string; currentScore: number; pastScore: number },
>(teams: T[], key: 'currentScore' | 'pastScore'): Map<string, number> {
  return new Map(
    [...teams]
      .sort((a, b) => b[key] - a[key])
      .map((team, index) => [team.id, index + 1])
  )
}

function addViewportTeams(
  config: GraphVisibilityConfig,
  visibleTeamIds: Set<string>,
  contextTeamIds: Set<string>
) {
  if (config.minRank <= 0 || config.maxRank < config.minRank) {
    addRankRange(
      config.entries,
      1,
      Math.min(10, config.entries.length),
      visibleTeamIds
    )
    return
  }

  if (config.showTop3Context) {
    for (let index = 0; index < Math.min(3, config.entries.length); index++) {
      const teamId = config.entries[index]!.id
      visibleTeamIds.add(teamId)
      if (index + 1 < config.minRank || index + 1 > config.maxRank) {
        contextTeamIds.add(teamId)
      }
    }
  }

  addRankRange(
    config.entries,
    config.minRank,
    Math.min(config.maxRank, config.minRank + PAGE_SIZE - 1),
    visibleTeamIds
  )
}

function addRankRange(
  entries: { id: string }[],
  startRank: number,
  endRank: number,
  target: Set<string>
) {
  for (
    let rank = startRank;
    rank <= endRank && rank <= entries.length;
    rank++
  ) {
    target.add(entries[rank - 1]!.id)
  }
}
