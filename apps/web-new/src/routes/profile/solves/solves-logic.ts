import { getCategoryOrder } from '$lib/utils/categories'
import {
  isDynamicChallenge,
  type ChallengeInfo,
  type ProfileDynamicScore,
  type ProfileSolve,
} from '../analytics/analytics-data'

export type SortMode = 'category' | 'time' | 'points'

export const sortModeLabels: Record<SortMode, string> = {
  category: 'Sort by category',
  time: 'Sort by time',
  points: 'Sort by points',
}

export type DisplayRow = {
  id: string
  name: string
  category: string
  points: number | null
  solves: number | null
  isSolved: boolean
  isDynamic: boolean
  solvedAt: number | null
  bloodIndex: number | null
}

export type CategoryGroup = {
  category: string
  rows: DisplayRow[]
}

export type SolvesStats = {
  pointsEarned: number
  pointsTotal: number | null
  solved: number
  total: number | null
}

export type EmptyStateKind = 'no-matches' | 'no-data'

type BuildDisplayRowsInput = {
  challenges: ChallengeInfo[] | null | undefined
  solves: ProfileSolve[]
  dynamicScores?: ProfileDynamicScore[]
  showUnsolved: boolean
}

type BuildDisplayRowsResult = {
  rows: DisplayRow[]
  boardMerged: boolean
}

export function buildDisplayRows({
  challenges,
  solves,
  dynamicScores = [],
  showUnsolved,
}: BuildDisplayRowsInput): BuildDisplayRowsResult {
  const boardMerged =
    showUnsolved && challenges != null && challenges.length > 0

  if (!boardMerged) {
    return { rows: solves.map(rowFromSolve), boardMerged: false }
  }

  const solveMap = new Map(solves.map(solve => [solve.id, solve]))
  const dynamicScoreMap = new Map(dynamicScores.map(score => [score.id, score]))
  const boardIds = new Set(challenges.map(challenge => challenge.id))

  const rows: DisplayRow[] = challenges.map(challenge => {
    const dynamic = isDynamicChallenge(challenge)
    const solve = solveMap.get(challenge.id)

    return {
      id: challenge.id,
      name: challenge.name,
      category: challenge.category,
      points: dynamic
        ? (dynamicScoreMap.get(challenge.id)?.points ?? 0)
        : challenge.points,
      solves: dynamic ? null : challenge.solves,
      isSolved: dynamic ? false : solveMap.has(challenge.id),
      isDynamic: dynamic,
      solvedAt: dynamic ? null : (solve?.createdAt ?? null),
      bloodIndex: dynamic ? null : (solve?.bloodIndex ?? null),
    }
  })

  for (const solve of solves) {
    if (!boardIds.has(solve.id)) rows.push(rowFromSolve(solve))
  }

  return { rows, boardMerged: true }
}

export function filterRows(
  rows: DisplayRow[],
  { search, hideSolved }: { search: string; hideSolved: boolean }
): DisplayRow[] {
  let filtered = rows

  const query = search.trim().toLowerCase()
  if (query) {
    filtered = filtered.filter(
      row =>
        row.name.toLowerCase().includes(query) ||
        row.category.toLowerCase().includes(query)
    )
  }

  if (hideSolved) {
    filtered = filtered.filter(row => !row.isSolved)
  }

  return filtered
}

export function nextSortMode(mode: SortMode): SortMode {
  if (mode === 'category') return 'time'
  if (mode === 'time') return 'points'
  return 'category'
}

export function sortRowsByMode(
  rows: DisplayRow[],
  mode: SortMode
): DisplayRow[] {
  if (mode === 'time') return [...rows].sort(compareByTime)
  if (mode === 'points') return [...rows].sort(compareByPoints)
  return [...rows]
}

export function groupRowsByCategory(rows: DisplayRow[]): CategoryGroup[] {
  const grouped = new Map<string, DisplayRow[]>()
  for (const row of rows) {
    const list = grouped.get(row.category) ?? []
    list.push(row)
    grouped.set(row.category, list)
  }

  for (const list of grouped.values()) {
    list.sort(compareWithinGroup)
  }

  return Array.from(grouped.entries())
    .map(([category, groupRows]) => ({ category, rows: groupRows }))
    .sort((a, b) => compareCategories(a.category, b.category))
}

export function computeSolvesStats({
  rows,
  boardMerged,
}: {
  rows: DisplayRow[]
  boardMerged: boolean
}): SolvesStats {
  const staticRows = rows.filter(row => !row.isDynamic)
  const dynamicRows = rows.filter(row => row.isDynamic)

  const staticPointsEarned = staticRows
    .filter(row => row.isSolved)
    .reduce((sum, row) => sum + (row.points ?? 0), 0)
  const dynamicPointsEarned = dynamicRows.reduce(
    (sum, row) => sum + (row.points ?? 0),
    0
  )

  return {
    pointsEarned: staticPointsEarned + dynamicPointsEarned,
    pointsTotal:
      boardMerged && dynamicRows.length === 0
        ? staticRows.reduce((sum, row) => sum + (row.points ?? 0), 0)
        : null,
    solved: staticRows.filter(row => row.isSolved).length,
    total: boardMerged ? staticRows.length : null,
  }
}

export function selectEmptyState({
  totalRowCount,
  filteredRowCount,
}: {
  totalRowCount: number
  filteredRowCount: number
}): EmptyStateKind | null {
  if (filteredRowCount > 0) return null
  return totalRowCount > 0 ? 'no-matches' : 'no-data'
}

function rowFromSolve(solve: ProfileSolve): DisplayRow {
  return {
    id: solve.id,
    name: solve.name,
    category: solve.category,
    points: solve.points,
    solves: solve.solves,
    isSolved: true,
    isDynamic: false,
    solvedAt: solve.createdAt,
    bloodIndex: solve.bloodIndex,
  }
}

function compareByTime(a: DisplayRow, b: DisplayRow): number {
  if (a.solvedAt !== null && b.solvedAt !== null) return b.solvedAt - a.solvedAt
  if (a.solvedAt !== null) return -1
  if (b.solvedAt !== null) return 1
  return a.name.localeCompare(b.name)
}

function compareByPoints(a: DisplayRow, b: DisplayRow): number {
  const pointsDiff = (b.points ?? 0) - (a.points ?? 0)
  if (pointsDiff !== 0) return pointsDiff
  return a.name.localeCompare(b.name)
}

function compareWithinGroup(a: DisplayRow, b: DisplayRow): number {
  if (a.isSolved !== b.isSolved) return a.isSolved ? -1 : 1
  if (a.solves !== b.solves) return (b.solves ?? 0) - (a.solves ?? 0)
  return a.name.localeCompare(b.name)
}

function compareCategories(a: string, b: string): number {
  const orderA = getCategoryOrder(a)
  const orderB = getCategoryOrder(b)
  if (orderA === -1 && orderB === -1) return a.localeCompare(b)
  if (orderA === -1) return 1
  if (orderB === -1) return -1
  return orderA - orderB
}
