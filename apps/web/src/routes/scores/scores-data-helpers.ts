import {
  DELTA_WINDOW,
  SELF_COLOR,
  SPARKLINE_WINDOW,
} from '$lib/constants/scores'
import { getRankColorForPosition } from '$lib/utils'
import {
  getCategoryConfig,
  getCategoryKeyOrAlias,
  getScoreboardCategoryOrder,
} from '$lib/utils/categories'
import {
  SCORE_CELL_WIDTH_PX,
  SCORE_DYNAMIC_CELL_WIDTH_PX,
  SCORE_ROW_GAP_PX,
} from './scores-layout-constants'
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
  scoringKind?: 'decay' | 'dynamic'
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
      scoringKind: info.scoringKind ?? 'decay',
      order: getScoreboardCategoryOrder(info.category),
      config: getCategoryConfig(info.category),
    }))
    .filter(challenge => getCategoryKeyOrAlias(challenge.category) !== 'sanity')
    .sort(compareChallengesByCategory)
}

export function isDynamicChallenge(challenge: {
  scoringKind?: 'decay' | 'dynamic'
}): boolean {
  return challenge.scoringKind === 'dynamic'
}

export function getChallengeCellWidth(challenge: {
  scoringKind?: 'decay' | 'dynamic'
}): number {
  return isDynamicChallenge(challenge)
    ? SCORE_DYNAMIC_CELL_WIDTH_PX
    : SCORE_CELL_WIDTH_PX
}

export function getFixedCellsWidth(cellCount: number): number {
  return cellCount * (SCORE_CELL_WIDTH_PX + SCORE_ROW_GAP_PX)
}

export function getChallengeCellsWidth(
  challenges: readonly { scoringKind?: 'decay' | 'dynamic' }[]
): number {
  let width = 0
  for (const challenge of challenges) {
    width += getChallengeCellWidth(challenge) + SCORE_ROW_GAP_PX
  }
  return width
}

export function getChallengeCellsInnerWidth(
  challenges: readonly { scoringKind?: 'decay' | 'dynamic' }[]
): number {
  const width = getChallengeCellsWidth(challenges)
  return width === 0 ? 0 : width - SCORE_ROW_GAP_PX
}

export function getChallengesBySolves(
  challenges: ChallengeInfo[]
): ChallengeInfo[] {
  return [...challenges].sort(
    (a, b) => a.solves - b.solves || a.name.localeCompare(b.name)
  )
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

export function getFocusedEntries(
  entries: ScoreEntry[],
  focusedChallengeId: string | null,
  challengesData: Record<string, { scoringKind?: 'decay' | 'dynamic' }> = {}
): ScoreEntry[] {
  if (!focusedChallengeId) return entries

  if (isDynamicChallenge(challengesData[focusedChallengeId] ?? {})) {
    return entries
  }

  const matched: { entry: ScoreEntry; solveTime: number }[] = []
  for (const entry of entries) {
    const solve = entry.solves.find(s => s.id === focusedChallengeId)
    if (solve) matched.push({ entry, solveTime: solve.solveTime })
  }
  matched.sort((a, b) => a.solveTime - b.solveTime)
  return matched.map(m => m.entry)
}

export interface SolvesAndTimesByTeam {
  solvesByTeam: Map<string, Set<string>>
  solveTimesByTeam: Map<string, Map<string, number>>
  challengePointsByTeam: Map<string, Map<string, number>>
  challengePointDeltasByTeam: Map<string, Map<string, number>>
}

export function getSolvesAndTimesByTeam(
  entries: ScoreEntry[]
): SolvesAndTimesByTeam {
  const solvesByTeam = new Map<string, Set<string>>()
  const solveTimesByTeam = new Map<string, Map<string, number>>()
  const challengePointsByTeam = new Map<string, Map<string, number>>()
  const challengePointDeltasByTeam = new Map<string, Map<string, number>>()
  for (const entry of entries) {
    const ids = new Set<string>()
    const times = new Map<string, number>()
    const points = new Map<string, number>()
    const pointDeltas = new Map<string, number>()
    for (const solve of entry.solves) {
      ids.add(solve.id)
      times.set(solve.id, solve.solveTime)
    }
    for (const score of entry.dynamicScores) {
      points.set(score.id, score.points)
      pointDeltas.set(score.id, score.pointDelta)
    }
    solvesByTeam.set(entry.id, ids)
    solveTimesByTeam.set(entry.id, times)
    challengePointsByTeam.set(entry.id, points)
    challengePointDeltasByTeam.set(entry.id, pointDeltas)
  }
  return {
    solvesByTeam,
    solveTimesByTeam,
    challengePointsByTeam,
    challengePointDeltasByTeam,
  }
}

export function getOriginalRankByTeam(
  entries: ScoreEntry[]
): Map<string, number> {
  return new Map(entries.map((entry, index) => [entry.id, index + 1]))
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

export function getCategoryStatsForSolves(
  solves: Set<string> | null,
  group: CategoryGroup
) {
  const challenges = group.challenges.filter(
    challenge => !isDynamicChallenge(challenge)
  )
  const solved = solves
    ? challenges.filter(challenge => solves.has(challenge.id)).length
    : 0
  const total = challenges.length
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
  return selfData && !data.some(team => team.id === selfData.id)
    ? [...data, selfData]
    : data
}

export function getSparklineDataByTeam(
  allGraphData: ScoreGraphEntry[],
  selfGraphData: ScoreGraphEntry | null | undefined
): Map<string, ScoreGraphPoint[]> {
  const allTeams = mergeWithSelfGraph(allGraphData, selfGraphData)
  let maxTime = 0
  for (const team of allTeams) {
    for (const point of team.points) {
      if (point.time > maxTime) maxTime = point.time
    }
  }
  const windowStart = maxTime - SPARKLINE_WINDOW
  return new Map(
    allTeams.map(team => [team.id, filterPoints(team.points, windowStart)])
  )
}

export function getRankDeltaByTeam(
  search: string | undefined,
  allGraphData: ScoreGraphEntry[],
  selfGraphData: ScoreGraphEntry | null | undefined
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
    if (!selfInTop3 || config.showTop3Context)
      visibleTeamIds.add(config.currentUserId)
  }

  return { visibleTeamIds, contextTeamIds }
}

export function getEmptyGraphVisibility(): GraphVisibility {
  return { visibleTeamIds: new Set(), contextTeamIds: new Set() }
}

interface ScreenshotTeamSource {
  id: string
  name: string
  avatarUrl: string | null
  countryCode: string | null
  statusText: string | null
  score: number
  solveCount: number
}

export function getVisibleSolveCount(
  solves: readonly { id: string }[],
  challengesData: Record<string, { scoringKind?: 'decay' | 'dynamic' }>
): number {
  return solves.filter(
    solve => !isDynamicChallenge(challengesData[solve.id] ?? {})
  ).length
}

function buildScreenshotEntry(
  source: ScreenshotTeamSource,
  rank: number,
  isCurrentUser: boolean,
  color: string | undefined,
  sparklineData: ScoreGraphPoint[] | undefined
): ScreenshotTeamEntry {
  return {
    id: source.id,
    rank,
    name: source.name,
    avatarUrl: source.avatarUrl,
    countryCode: source.countryCode,
    statusText: source.statusText,
    score: source.score,
    solveCount: source.solveCount,
    isCurrentUser,
    color,
    sparklineData,
  }
}

export function getScreenshotTeams(
  entries: ScoreEntry[],
  currentUser: CurrentUserScoreData | null | undefined,
  challengesData: Record<string, { scoringKind?: 'decay' | 'dynamic' }>,
  teamColorMap: Map<string, string>,
  sparklineDataByTeam: Map<string, ScoreGraphPoint[]>
): ScreenshotTeamEntry[] {
  return entries.map((entry, index) =>
    buildScreenshotEntry(
      {
        ...entry,
        solveCount: getVisibleSolveCount(entry.solves, challengesData),
      },
      index + 1,
      currentUser?.id === entry.id,
      teamColorMap.get(entry.id),
      sparklineDataByTeam.get(entry.id)
    )
  )
}

export function getScreenshotSelfTeam(
  currentUser: CurrentUserScoreData | null | undefined,
  challengesData: Record<string, { scoringKind?: 'decay' | 'dynamic' }>,
  sparklineDataByTeam: Map<string, ScoreGraphPoint[]>
): ScreenshotTeamEntry | null {
  if (!currentUser?.globalPlace) return null
  return buildScreenshotEntry(
    {
      ...currentUser,
      solveCount: getVisibleSolveCount(currentUser.solves, challengesData),
    },
    currentUser.globalPlace,
    true,
    SELF_COLOR,
    sparklineDataByTeam.get(currentUser.id)
  )
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

function filterPoints(
  points: ScoreGraphPoint[],
  minTime = 0
): ScoreGraphPoint[] {
  return points.filter(point => point.time >= minTime)
}

function getScoresAt(
  team: ScoreGraphEntry,
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

function getRanks<T extends { currentScore: number; pastScore: number }>(
  teams: (T & { id: string })[],
  key: 'currentScore' | 'pastScore'
): Map<string, number> {
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

  if (config.showTop3Context && !config.focusedChallengeId) {
    for (let index = 0; index < Math.min(3, config.entries.length); index++) {
      const teamId = config.entries[index]!.id
      visibleTeamIds.add(teamId)
      if (index + 1 < config.minRank || index + 1 > config.maxRank) {
        contextTeamIds.add(teamId)
      }
    }
  }

  addRankRange(config.entries, config.minRank, config.maxRank, visibleTeamIds)
}

function addRankRange(
  entries: ScoreEntry[],
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
