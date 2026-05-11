import type { ClientConfig, PublicUserProfile } from '@rctf/types'
import type { ChartConfig } from '$lib/components/ui/chart/chart-utils'
import {
  getCategoryConfig,
  getCategoryKeyOrAlias,
  getCategoryOrder,
  getCategoryStyle,
} from '$lib/utils'
import { formatRelativeHours } from '$lib/utils/time'

export type ProfileSolve = PublicUserProfile['solves'][number]

export interface ChallengeInfo {
  id: string
  name: string
  category: string
  points: number
  solves: number
}

export type CategoryStat = {
  key: string
  label: string
  fullLabel: string
  color: string
  style: string
  category: string
  total: number
  solved: number
  pointsTotal: number
  pointsEarned: number
}

export type ProfileBarDatum = {
  key: string
  label: string
  value: number
  max: number
  color: string
  style?: string
  tooltipLabel?: string
  detail?: string
}

export type CadenceDatum = {
  key: string
  label: string
  start: number
  end: number
  count: number
}

export type TimelineDatum = {
  key: string
  name: string
  categoryLabel: string
  categoryTooltipLabel: string
  categoryKey: string
  color: string
  style: string
  time: number
  points: number | null
}

export type ActivityDomain = {
  start: number
  end: number
  bucketSize: number
}

type ChartConfigDatum = {
  key: string
  label: string
  color: string
}

type CategoryBarMetrics = {
  value: number
  max: number
  detail: string
}

const msPerMinute = 60 * 1000
const msPerHour = 60 * msPerMinute
const msPerDay = 24 * msPerHour
const neutralChartColor = 'var(--foreground-l4)'

type DifficultyBin = {
  key: string
  label: string
  accepts: (solveCount: number) => boolean
}

const difficultyBins: DifficultyBin[] = [
  { key: 'solo', label: '1 solve', accepts: solveCount => solveCount <= 1 },
  {
    key: 'rare',
    label: '2-5',
    accepts: solveCount => solveCount >= 2 && solveCount <= 5,
  },
  {
    key: 'hard',
    label: '6-20',
    accepts: solveCount => solveCount >= 6 && solveCount <= 20,
  },
  {
    key: 'medium',
    label: '21-50',
    accepts: solveCount => solveCount >= 21 && solveCount <= 50,
  },
  { key: 'common', label: '51+', accepts: solveCount => solveCount >= 51 },
]

const cadenceBucketSizes = [
  15 * msPerMinute,
  30 * msPerMinute,
  msPerHour,
  2 * msPerHour,
  4 * msPerHour,
  6 * msPerHour,
  12 * msPerHour,
  msPerDay,
  2 * msPerDay,
]

export function sortProfileSolves(solves: ProfileSolve[]): ProfileSolve[] {
  return [...solves].toSorted((a, b) => a.createdAt - b.createdAt)
}

export function buildCategoryStats({
  challenges,
  solves,
}: {
  challenges: ChallengeInfo[]
  solves: ProfileSolve[]
}): CategoryStat[] {
  const stats = new Map<string, CategoryStat>()
  const challengeIds = new Set(challenges.map(challenge => challenge.id))

  for (const challenge of challenges) {
    const stat = getOrCreateCategoryStat(stats, challenge.category)
    stat.total += 1
    stat.pointsTotal += challenge.points
  }

  for (const solve of solves) {
    const stat = getOrCreateCategoryStat(stats, solve.category)
    if (challenges.length === 0 || !challengeIds.has(solve.id)) {
      stat.total += 1
      stat.pointsTotal += solve.points ?? 0
    }
    stat.solved += 1
    stat.pointsEarned += solve.points ?? 0
  }

  return Array.from(stats.values()).sort(compareCategoryStats)
}

export function buildCategoryCompletionData(
  stats: CategoryStat[]
): ProfileBarDatum[] {
  return buildCategoryBarData(stats, stat => ({
    value: stat.solved,
    max: stat.total,
    detail: `${stat.solved}/${stat.total} solved`,
  }))
}

export function buildCategoryPointsData(
  stats: CategoryStat[]
): ProfileBarDatum[] {
  return buildCategoryBarData(stats, stat => ({
    value: stat.pointsEarned,
    max: stat.pointsTotal,
    detail: `${stat.pointsEarned.toLocaleString()}/${stat.pointsTotal.toLocaleString()} pts`,
  }))
}

export function buildDifficultyData({
  challenges,
  solves,
}: {
  challenges: ChallengeInfo[]
  solves: ProfileSolve[]
}): ProfileBarDatum[] {
  return difficultyBins.map(bin => {
    const solvesInBin = solves.filter(solve => bin.accepts(solve.solves ?? 0))
    const challengesInBin = challenges.filter(challenge =>
      bin.accepts(challenge.solves)
    )
    const total =
      challenges.length > 0 ? challengesInBin.length : solvesInBin.length
    const points = sumSolvePoints(solvesInBin)

    return {
      key: bin.key,
      label: bin.label,
      value: solvesInBin.length,
      max: Math.max(total, solvesInBin.length),
      color: neutralChartColor,
      detail: `${points.toLocaleString()} pts`,
    }
  })
}

export function buildActivityDomain({
  clientConfig,
  solves,
}: {
  clientConfig: ClientConfig
  solves: ProfileSolve[]
}): ActivityDomain {
  const firstSolve = solves[0]
  const lastSolve = solves.at(-1)
  if (!firstSolve || !lastSolve) {
    return {
      start: clientConfig.startTime,
      end: Math.min(clientConfig.endTime, clientConfig.startTime + msPerHour),
      bucketSize: msPerHour,
    }
  }

  const duration = Math.max(
    lastSolve.createdAt - firstSolve.createdAt,
    msPerHour
  )
  const bucketSize = chooseCadenceBucketSize(duration)
  const start = Math.max(
    clientConfig.startTime,
    alignTimeToCtfStart(
      firstSolve.createdAt,
      bucketSize,
      clientConfig.startTime,
      'floor'
    )
  )
  const end = Math.min(
    clientConfig.endTime,
    Math.max(
      start + bucketSize,
      alignTimeToCtfStart(
        lastSolve.createdAt + bucketSize,
        bucketSize,
        clientConfig.startTime,
        'ceil'
      )
    )
  )

  return { start, end, bucketSize }
}

export function buildCadenceData({
  ctfStart,
  domain,
  solves,
}: {
  ctfStart: number
  domain: ActivityDomain
  solves: ProfileSolve[]
}): CadenceDatum[] {
  const buckets = createCadenceBuckets(domain, ctfStart)

  for (const solve of solves) {
    if (solve.createdAt < domain.start || solve.createdAt > domain.end) continue

    const index = Math.min(
      Math.floor((solve.createdAt - domain.start) / domain.bucketSize),
      Math.max(buckets.length - 1, 0)
    )
    const bucket = buckets[index]
    if (bucket) bucket.count += 1
  }

  return buckets
}

export function buildTimelineData(solves: ProfileSolve[]): TimelineDatum[] {
  return solves.map(solve => {
    const category = getCategoryDisplay(solve.category)
    return {
      key: solve.id,
      name: solve.name,
      categoryLabel: category.label,
      categoryTooltipLabel: category.fullLabel,
      categoryKey: category.key,
      color: category.color,
      style: category.style,
      time: solve.createdAt,
      points: solve.points,
    }
  })
}

export function buildTimelineCategories(
  data: TimelineDatum[],
  stats: CategoryStat[]
): string[] {
  return Array.from(new Set(data.map(item => item.categoryLabel))).sort(
    (a, b) => {
      const statA = stats.find(stat => stat.label === a)
      const statB = stats.find(stat => stat.label === b)
      return compareCategoryNames(a, b, statA?.category, statB?.category)
    }
  )
}

export function buildChartConfig(data: ChartConfigDatum[]): ChartConfig {
  return Object.fromEntries(
    data.map(item => [item.key, { label: item.label, color: item.color }])
  ) satisfies ChartConfig
}

export function maxChartValue<T>(
  data: T[],
  getValue: (item: T) => number
): number {
  let max = 1
  for (const item of data) {
    max = Math.max(max, getValue(item))
  }
  return max
}

function buildCategoryBarData(
  stats: CategoryStat[],
  getMetrics: (stat: CategoryStat) => CategoryBarMetrics
): ProfileBarDatum[] {
  return stats.map(stat => {
    const metrics = getMetrics(stat)
    return {
      key: stat.key,
      label: stat.label,
      value: metrics.value,
      max: Math.max(metrics.max, 1),
      color: stat.color,
      style: stat.style,
      tooltipLabel: stat.fullLabel,
      detail: metrics.detail,
    }
  })
}

function getOrCreateCategoryStat(
  stats: Map<string, CategoryStat>,
  category: string
): CategoryStat {
  const categoryDisplay = getCategoryDisplay(category)
  const existing = stats.get(categoryDisplay.key)
  if (existing) return existing

  const stat = {
    ...categoryDisplay,
    category,
    total: 0,
    solved: 0,
    pointsTotal: 0,
    pointsEarned: 0,
  }
  stats.set(categoryDisplay.key, stat)
  return stat
}

function getCategoryDisplay(category: string) {
  const config = getCategoryConfig(category)
  const key = getCategoryKeyOrAlias(category)

  return {
    key,
    label: key,
    fullLabel: config.name,
    color: `var(--foreground-${config.color}-l1)`,
    style: getCategoryStyle(config.color),
  }
}

function compareCategoryStats(a: CategoryStat, b: CategoryStat): number {
  return compareCategoryNames(a.label, b.label, a.category, b.category)
}

function compareCategoryNames(
  labelA: string,
  labelB: string,
  categoryA?: string,
  categoryB?: string
): number {
  const orderA = categoryA === undefined ? -1 : getCategoryOrder(categoryA)
  const orderB = categoryB === undefined ? -1 : getCategoryOrder(categoryB)

  if (orderA === -1 && orderB === -1) return labelA.localeCompare(labelB)
  if (orderA === -1) return 1
  if (orderB === -1) return -1
  return orderA - orderB
}

function sumSolvePoints(solves: ProfileSolve[]): number {
  return solves.reduce((sum, solve) => sum + (solve.points ?? 0), 0)
}

function chooseCadenceBucketSize(duration: number): number {
  const targetBucketSize = duration / 8
  return (
    cadenceBucketSizes.find(size => size >= targetBucketSize) ?? 2 * msPerDay
  )
}

function alignTimeToCtfStart(
  time: number,
  bucketSize: number,
  ctfStart: number,
  rounding: 'floor' | 'ceil'
): number {
  const offset = (time - ctfStart) / bucketSize
  const bucket = rounding === 'floor' ? Math.floor(offset) : Math.ceil(offset)
  return ctfStart + bucket * bucketSize
}

function createCadenceBuckets(
  domain: ActivityDomain,
  ctfStart: number
): CadenceDatum[] {
  const buckets: CadenceDatum[] = []

  for (
    let start = domain.start;
    start < domain.end;
    start += domain.bucketSize
  ) {
    const end = Math.min(start + domain.bucketSize, domain.end)
    buckets.push({
      key: `${start}`,
      label: formatRelativeHours(start, ctfStart),
      start,
      end,
      count: 0,
    })
  }

  return buckets
}
