import type { CategoryColor, CategoryConfig } from '$lib/utils/categories'
import {
  getProfileCategoryDisplay,
  sortProfileSolves,
  type ProfileDynamicScore,
  type ProfileSolve,
} from './profile-analytics-data'

export type GraphLinePoint = { time: number; score: number }

// Structural subset of LeaderboardGraphEntry: the cumulative-score samples plus
// the optional dynamic-scoring history the offset-hack graph returns.
export type GraphSampleInput = {
  points: GraphLinePoint[]
  dynamicPoints?: GraphLinePoint[]
}

export type GraphSolveDot = {
  key: string
  time: number
  /** Running score after this solve; the dot's y value. */
  score: number
  scoreBefore: number
  points: number | null
  name: string
  catShort: string
  categoryIcon: CategoryConfig['icon']
  color: CategoryColor
}

export type ProfileGraphInput = {
  graphData: GraphSampleInput
  solves: ProfileSolve[]
  dynamicScores: ProfileDynamicScore[]
  startTime: number
  endTime: number
  splitDynamicScore: boolean
}

export type ProfileGraphData = {
  totalLine: GraphLinePoint[]
  staticLine: GraphLinePoint[]
  dynamicLine: GraphLinePoint[]
  hasTotalLine: boolean
  hasStaticLine: boolean
  hasDynamicLine: boolean
  solveDots: GraphSolveDot[]
  /** null when there is nothing to plot (no samples and no solves). */
  xDomain: [number, number] | null
  yMax: number
}

// Single-sample series would collapse the x-domain to a point; pad it out to a
// half-hour window so the line and its dot stay visible (ports the old graph).
const DOMAIN_PADDING_MS = 30 * 60 * 1000

function sortByTime(points: GraphLinePoint[]): GraphLinePoint[] {
  return [...points].sort((a, b) => a.time - b.time)
}

/** Step-function lookup: the score of the last sample at or before `time`. */
export function scoreAt(time: number, points: GraphLinePoint[]): number {
  let score = 0
  for (const point of points) {
    if (point.time > time) break
    score = point.score
  }
  return score
}

// Only returns a value when a sample lands exactly on `time`; used to recover a
// solve's static score from the sampled static line without interpolation.
function exactScoreAt(time: number, points: GraphLinePoint[]): number | null {
  for (const point of points) {
    if (point.time === time) return point.score
    if (point.time > time) break
  }
  return null
}

function buildDynamicLine(
  totalLine: GraphLinePoint[],
  dynamicHistory: GraphLinePoint[],
  currentDynamicScore: number,
  splitDynamicScore: boolean
): GraphLinePoint[] {
  if (!splitDynamicScore) return []
  if (dynamicHistory.length > 0) return dynamicHistory
  if (currentDynamicScore > 0) {
    return totalLine.map(point => ({
      time: point.time,
      score: currentDynamicScore,
    }))
  }
  return []
}

function staticScoreBefore(
  time: number,
  points: number | null,
  staticLine: GraphLinePoint[]
): number {
  const exact = exactScoreAt(time, staticLine)
  if (exact !== null && points !== null) {
    return Math.max(exact - points, 0)
  }
  return scoreAt(time, staticLine)
}

function buildSolveDots(
  solves: ProfileSolve[],
  staticLine: GraphLinePoint[],
  splitDynamicScore: boolean
): GraphSolveDot[] {
  let runningScore = 0

  return sortProfileSolves(solves).map(solve => {
    const points = solve.awardedPoints ?? solve.points
    const category = getProfileCategoryDisplay(solve.category)
    // With dynamic scoring the naive accumulator overshoots, so the static
    // baseline is read from the sampled static line; otherwise just accumulate.
    const scoreBefore =
      splitDynamicScore && staticLine.length > 0
        ? staticScoreBefore(solve.createdAt, points, staticLine)
        : runningScore
    const score = scoreBefore + (points ?? 0)
    runningScore = score

    return {
      key: `solve-${solve.id}`,
      time: solve.createdAt,
      score,
      scoreBefore,
      points,
      name: solve.name,
      catShort: category.key,
      categoryIcon: category.icon,
      color: category.color,
    }
  })
}

function timeDomain(
  points: GraphLinePoint[],
  startTime: number,
  endTime: number
): [number, number] | null {
  if (points.length === 0) return null

  let min = Infinity
  let max = -Infinity
  for (const point of points) {
    if (point.time < min) min = point.time
    if (point.time > max) max = point.time
  }

  const lo = startTime > 0 ? startTime : min
  const hi = min === max ? max + DOMAIN_PADDING_MS : max
  return [lo, Math.min(endTime, hi)]
}

function scoreMax(points: GraphLinePoint[]): number {
  let max = 1
  for (const point of points) {
    if (point.score > max) max = point.score
  }
  return max
}

/**
 * Derives the three line series, per-solve dots, and axis domains for the
 * profile score graph. Ports the old `profile-graph.svelte` derivations: total
 * from the graph samples, static as total minus the dynamic score at each time,
 * dynamic from the sampled history (or a flat current value), all split only
 * when `splitDynamicScore` is set and dynamic data exists.
 */
export function buildProfileGraphData(
  input: ProfileGraphInput
): ProfileGraphData {
  const { graphData, solves, dynamicScores, startTime, endTime } = input
  const { splitDynamicScore } = input

  const totalLine = sortByTime(graphData.points)
  const dynamicHistory = sortByTime(graphData.dynamicPoints ?? [])
  const currentDynamicScore = dynamicScores.reduce(
    (sum, score) => sum + score.points,
    0
  )

  const dynamicLine = buildDynamicLine(
    totalLine,
    dynamicHistory,
    currentDynamicScore,
    splitDynamicScore
  )
  const staticLine = splitDynamicScore
    ? totalLine.map(point => ({
        time: point.time,
        score: Math.max(point.score - scoreAt(point.time, dynamicLine), 0),
      }))
    : []

  const hasTotalLine = totalLine.length > 1
  const hasStaticLine = splitDynamicScore && staticLine.length > 1
  const hasDynamicLine =
    splitDynamicScore &&
    dynamicLine.length > 1 &&
    dynamicLine.some(point => point.score > 0)

  const solveDots = buildSolveDots(solves, staticLine, splitDynamicScore)

  const domainPoints = [
    ...(hasTotalLine ? totalLine : []),
    ...(hasStaticLine ? staticLine : []),
    ...(hasDynamicLine ? dynamicLine : []),
    ...solveDots.map(dot => ({ time: dot.time, score: dot.score })),
  ]
  const effectivePoints = domainPoints.length > 0 ? domainPoints : totalLine

  return {
    totalLine,
    staticLine,
    dynamicLine,
    hasTotalLine,
    hasStaticLine,
    hasDynamicLine,
    solveDots,
    xDomain: timeDomain(effectivePoints, startTime, endTime),
    yMax: scoreMax(effectivePoints),
  }
}
