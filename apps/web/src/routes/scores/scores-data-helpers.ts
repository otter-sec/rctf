import { CUTOFF_TIME, DELTA_WINDOW, SELF_COLOR, SPARKLINE_WINDOW } from '$lib/constants/scores'
import { getRankColorForPosition } from '$lib/utils'
import {
  getCategoryConfig,
  getCategoryKeyOrAlias,
  getScoreboardCategoryOrder,
} from '$lib/utils/categories'
import type {
  CategoryGroup,
  ChallengeInfo,
  CurrentUserScoreData,
  GraphVisibility,
  ScoreEntry,
  ScoreGraphEntry,
  ScoreGraphPoint,
  ScreenshotTeamEntry,
} from './types'

interface ChallengeSource {
  name: string
  category: string
  points: number
  solves: number
  firstSolvers?: { id: string }[]
}

interface GraphVisibilityConfig {
  entries: ScoreEntry[]
  isLoading: boolean
  minRank: number
  maxRank: number
  focusedChallengeId: string | null
  showTop3Context: boolean
  showSelfContext: boolean
  currentUserId: string | null
  teamRanks: Map<string, number>
}

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

export function getChallengesBySolves(challenges: ChallengeInfo[]): ChallengeInfo[] {
  return [...challenges].sort((a, b) => a.solves - b.solves || a.name.localeCompare(b.name))
}

export function getCategoryGroups(challenges: ChallengeInfo[]): CategoryGroup[] {
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

export function getFocusedEntries(
  entries: ScoreEntry[],
  focusedChallengeId: string | null
): ScoreEntry[] {
  if (!focusedChallengeId) return entries

  return entries
    .filter(entry => entry.solves.some(solve => solve.id === focusedChallengeId))
    .sort((a, b) => {
      const aTime = a.solves.find(solve => solve.id === focusedChallengeId)?.solveTime ?? Infinity
      const bTime = b.solves.find(solve => solve.id === focusedChallengeId)?.solveTime ?? Infinity
      return aTime - bTime
    })
}

export function getSolvesByTeam(entries: ScoreEntry[]): Map<string, Set<string>> {
  return new Map(entries.map(entry => [entry.id, new Set(entry.solves.map(solve => solve.id))]))
}

export function getOriginalRankByTeam(entries: ScoreEntry[]): Map<string, number> {
  return new Map(entries.map((entry, index) => [entry.id, index + 1]))
}

export function getSolveTimesByTeam(entries: ScoreEntry[]): Map<string, Map<string, number>> {
  return new Map(
    entries.map(entry => [
      entry.id,
      new Map(entry.solves.map(solve => [solve.id, solve.solveTime])),
    ])
  )
}

export function getBloodIndex(
  challengesData: Record<string, ChallengeSource>,
  challengeId: string,
  teamId: string
): number {
  const challenge = challengesData[challengeId]
  if (!challenge?.firstSolvers) return -1
  return challenge.firstSolvers.findIndex(solver => solver.id === teamId)
}

export function getCategoryStatsForSolves(solves: Set<string> | null, group: CategoryGroup) {
  const solved = solves ? group.challenges.filter(challenge => solves.has(challenge.id)).length : 0
  const total = group.challenges.length
  return {
    solved,
    total,
    percent: total > 0 ? (solved / total) * 100 : 0,
  }
}

export function getTeamColorMap(
  entries: ScoreEntry[],
  currentUser: CurrentUserScoreData | null | undefined
): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of entries) {
    map.set(
      entry.id,
      getRankColorForPosition(entry.globalPlace, currentUser?.id === entry.id, entry.id)
    )
  }
  if (currentUser) map.set(currentUser.id, SELF_COLOR)
  return map
}

export function getTeamRanks(
  entries: ScoreEntry[],
  originalRankByTeam: Map<string, number>,
  search: string | undefined,
  focusedChallengeId: string | null
): Map<string, number> {
  if (!search && focusedChallengeId) return originalRankByTeam
  return new Map(entries.map((entry, index) => [entry.id, index + 1]))
}

export function mergeWithSelfGraph<T extends { id: string }>(
  data: T[],
  selfData: T | null | undefined
): T[] {
  return selfData && !data.some(team => team.id === selfData.id) ? [...data, selfData] : data
}

export function getSparklineDataByTeam(
  allGraphData: ScoreGraphEntry[],
  selfGraphData: ScoreGraphEntry | null | undefined
): Map<string, ScoreGraphPoint[]> {
  const allTeams = mergeWithSelfGraph(allGraphData, selfGraphData)
  let maxTime = 0
  for (const team of allTeams) {
    for (const point of filterPoints(team.points)) {
      if (point.time > maxTime) maxTime = point.time
    }
  }
  const windowStart = maxTime - SPARKLINE_WINDOW
  return new Map(allTeams.map(team => [team.id, filterPoints(team.points, windowStart)]))
}

export function getRankDeltaByTeam(
  search: string | undefined,
  allGraphData: ScoreGraphEntry[],
  selfGraphData: ScoreGraphEntry | null | undefined
): Map<string, number> {
  if (search) return new Map()
  const allPoints = allGraphData.flatMap(team =>
    team.points.filter(point => point.time <= CUTOFF_TIME)
  )
  if (allPoints.length === 0) return new Map()

  const currentTime = Math.min(getMaxPointTime(allPoints), CUTOFF_TIME)
  const pastTime = currentTime - DELTA_WINDOW
  const allTeams = mergeWithSelfGraph(allGraphData, selfGraphData)
  const teamsWithScores = allTeams.map(team => ({
    id: team.id,
    currentScore: getLatestScore(team.points, currentTime),
    pastScore: getLatestScore(team.points, pastTime),
  }))
  const currentRankMap = getRanks(teamsWithScores, 'currentScore')
  const pastRankMap = getRanks(teamsWithScores, 'pastScore')

  return new Map(
    teamsWithScores
      .map(team => [
        team.id,
        (pastRankMap.get(team.id) ?? 0) - (currentRankMap.get(team.id) ?? 0),
      ] as const)
      .filter(([, delta]) => delta !== 0)
  )
}

export function getGraphVisibility(config: GraphVisibilityConfig): GraphVisibility {
  if (config.isLoading || config.entries.length === 0) {
    return getEmptyGraphVisibility()
  }

  const visibleTeamIds = new Set<string>()
  const contextTeamIds = new Set<string>()
  addViewportTeams(config, visibleTeamIds, contextTeamIds)

  if (config.currentUserId && config.showSelfContext) {
    const selfRank = config.teamRanks.get(config.currentUserId)
    const selfInTop3 = selfRank !== undefined && selfRank <= 3
    if (!selfInTop3 || config.showTop3Context) visibleTeamIds.add(config.currentUserId)
  }

  return { visibleTeamIds, contextTeamIds }
}

export function getEmptyGraphVisibility(): GraphVisibility {
  return { visibleTeamIds: new Set(), contextTeamIds: new Set() }
}

export function getScreenshotTeams(
  entries: ScoreEntry[],
  currentUser: CurrentUserScoreData | null | undefined,
  teamColorMap: Map<string, string>,
  sparklineDataByTeam: Map<string, ScoreGraphPoint[]>
): ScreenshotTeamEntry[] {
  return entries.map((entry, index) => ({
    id: entry.id,
    rank: index + 1,
    name: entry.name,
    avatarUrl: entry.avatarUrl,
    countryCode: entry.countryCode,
    statusText: entry.statusText,
    score: entry.score,
    solveCount: entry.solves.length,
    isCurrentUser: currentUser?.id === entry.id,
    color: teamColorMap.get(entry.id),
    sparklineData: sparklineDataByTeam.get(entry.id),
  }))
}

export function getScreenshotSelfTeam(
  currentUser: CurrentUserScoreData | null | undefined,
  sparklineDataByTeam: Map<string, ScoreGraphPoint[]>
): ScreenshotTeamEntry | null {
  if (!currentUser) return null
  return {
    id: currentUser.id,
    rank: currentUser.globalPlace ?? 0,
    name: currentUser.name,
    avatarUrl: currentUser.avatarUrl,
    countryCode: currentUser.countryCode,
    statusText: currentUser.statusText,
    score: currentUser.score,
    solveCount: currentUser.solves.length,
    isCurrentUser: true,
    color: SELF_COLOR,
    sparklineData: sparklineDataByTeam.get(currentUser.id),
  }
}

export function getScreenshotGraphData(allGraphData: ScoreGraphEntry[]): ScoreGraphEntry[] {
  return allGraphData.map(team => ({
    id: team.id,
    name: team.name,
    points: team.points,
  }))
}

function compareChallengesByCategory(a: ChallengeInfo, b: ChallengeInfo): number {
  if (a.order !== b.order) {
    if (a.order === -1 && b.order === -1) return a.category.localeCompare(b.category)
    if (a.order === -1) return 1
    if (b.order === -1) return -1
    return a.order - b.order
  }
  if (a.category !== b.category) return a.category.localeCompare(b.category)
  return b.points - a.points || a.name.localeCompare(b.name)
}

function filterPoints(points: ScoreGraphPoint[], minTime = 0): ScoreGraphPoint[] {
  return points.filter(point => point.time >= minTime && point.time <= CUTOFF_TIME)
}

function getMaxPointTime(points: ScoreGraphPoint[]): number {
  let maxTime = -Infinity
  for (const point of points) {
    if (point.time > maxTime) maxTime = point.time
  }
  return maxTime
}

function getLatestScore(points: ScoreGraphPoint[], targetTime: number): number {
  const valid = points.filter(point => point.time <= targetTime)
  if (!valid.length) return 0
  return valid.reduce((latest, point) => (point.time > latest.time ? point : latest)).score
}

function getRanks<T extends { currentScore: number; pastScore: number }>(
  teams: (T & { id: string })[],
  key: 'currentScore' | 'pastScore'
): Map<string, number> {
  return new Map(
    [...teams].sort((a, b) => b[key] - a[key]).map((team, index) => [team.id, index + 1])
  )
}

function addViewportTeams(
  config: GraphVisibilityConfig,
  visibleTeamIds: Set<string>,
  contextTeamIds: Set<string>
) {
  if (config.maxRank <= 10) {
    addRankRange(config.entries, 1, Math.min(10, config.entries.length), visibleTeamIds)
    return
  }

  if (config.showTop3Context && !config.focusedChallengeId) {
    for (let index = 0; index < Math.min(3, config.entries.length); index++) {
      const teamId = config.entries[index]!.id
      visibleTeamIds.add(teamId)
      if (index + 1 < config.minRank) contextTeamIds.add(teamId)
    }
  }

  const pinActive = config.showTop3Context && !config.focusedChallengeId
  const windowSize = pinActive ? 7 : 10
  const windowStart = Math.max(pinActive ? 4 : 1, config.maxRank - windowSize + 1)
  addRankRange(config.entries, windowStart, config.maxRank, visibleTeamIds)
}

function addRankRange(
  entries: ScoreEntry[],
  startRank: number,
  endRank: number,
  target: Set<string>
) {
  for (let rank = startRank; rank <= endRank && rank <= entries.length; rank++) {
    target.add(entries[rank - 1]!.id)
  }
}
