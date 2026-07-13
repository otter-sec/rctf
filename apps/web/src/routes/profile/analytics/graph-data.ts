import type { CategoryColor, CategoryConfig } from '$lib/utils/categories'
import {
  getProfileCategoryDisplay,
  type ProfileDynamicScore,
  type ProfileSolve,
} from './analytics-data'

export type GraphLinePoint = { time: number; score: number }

export type GraphSampleInput = {
  points: GraphLinePoint[]
  dynamicPoints?: GraphLinePoint[]
}

export type GraphSolveDot = {
  key: string
  time: number
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
  xDomain: [number, number] | null
  yMax: number
}

const DOMAIN_PADDING_MS = 30 * 60 * 1000

function sortByTime(points: GraphLinePoint[]): GraphLinePoint[] {
  return [...points].sort((a, b) => a.time - b.time)
}

export function scoreAt(time: number, points: GraphLinePoint[]): number {
  let low = 0
  let high = points.length - 1
  let score = 0

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const point = points[middle]!
    if (point.time <= time) {
      score = point.score
      low = middle + 1
    } else {
      high = middle - 1
    }
  }

  return score
}

function exactScoreAt(time: number, points: GraphLinePoint[]): number | null {
  let low = 0
  let high = points.length

  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (points[middle]!.time < time) {
      low = middle + 1
    } else {
      high = middle
    }
  }

  return points[low]?.time === time ? points[low]!.score : null
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

function buildStaticLine(
  totalLine: GraphLinePoint[],
  dynamicLine: GraphLinePoint[]
): GraphLinePoint[] {
  let dynamicIndex = 0
  let dynamicScore = 0

  return totalLine.map(point => {
    while (
      dynamicIndex < dynamicLine.length &&
      dynamicLine[dynamicIndex]!.time <= point.time
    ) {
      dynamicScore = dynamicLine[dynamicIndex]!.score
      dynamicIndex += 1
    }

    return {
      time: point.time,
      score: Math.max(point.score - dynamicScore, 0),
    }
  })
}

function scoreBeforeSolve(
  time: number,
  points: number | null,
  scoreLine: GraphLinePoint[]
): number {
  const exact = exactScoreAt(time, scoreLine)
  if (exact !== null && points !== null) {
    return Math.max(exact - points, 0)
  }
  return scoreAt(time, scoreLine)
}

function buildSolveDots(
  solves: ProfileSolve[],
  scoreLine: GraphLinePoint[]
): GraphSolveDot[] {
  let runningScore = 0

  return solves.map(solve => {
    const points = solve.awardedPoints ?? solve.points
    const category = getProfileCategoryDisplay(solve.category)
    // Anchor each dot to the team's real score line so decay is reflected. Accumulating
    // each solve's current value instead would ignore that earlier solves have since
    // decayed, drifting the dots above the line. The running sum is only a fallback for
    // when there is no line to anchor to.
    const scoreBefore =
      scoreLine.length > 0
        ? scoreBeforeSolve(solve.createdAt, points, scoreLine)
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
    ? buildStaticLine(totalLine, dynamicLine)
    : []

  const hasTotalLine = totalLine.length > 1
  const hasStaticLine = splitDynamicScore && staticLine.length > 1
  const hasDynamicLine =
    splitDynamicScore &&
    dynamicLine.length > 1 &&
    dynamicLine.some(point => point.score > 0)

  const solveDots = buildSolveDots(
    solves,
    splitDynamicScore ? staticLine : totalLine
  )

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
