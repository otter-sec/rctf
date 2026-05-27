import type { ClientConfig, PublicUserProfile } from '@rctf/types'
import {
  getCategoryConfig,
  getCategoryKeyOrAlias,
  getCategoryOrder,
  getCategoryStyle,
  type CategoryConfig,
} from '$lib/utils'
import { formatRelativeHours } from '$lib/utils/time'

export type ProfileSolve = PublicUserProfile['solves'][number]
export type ProfileDynamicScore = PublicUserProfile['dynamicScores'][number]

export type ChallengeInfo = {
  id: string
  name: string
  category: string
  points: number
  solves: number
  scoringKind?: 'decay' | 'dynamic'
}

export type CategoryStat = {
  key: string
  label: string
  fullLabel: string
  icon: CategoryConfig['icon']
  style: string
  category: string
  staticTotal: number
  solved: number
  pointsTotal: number
  staticPointsTotal: number
  pointsEarned: number
  dynamicPointsEarned: number
}

export type CategoryBarSegment = {
  key: string
  label: string
  value: number
  start: number
  end: number
  detail?: string
  hatched?: boolean
  muted?: boolean
}

export type CategoryBarDatum = {
  key: string
  label: string
  icon: CategoryConfig['icon']
  value: number
  max: number
  style: string
  tooltipLabel: string
  detail: string
  segments?: CategoryBarSegment[]
  fullClear?: boolean
  fullClearValue?: number
}

export type DifficultyDatum = {
  key: string
  label: string
  value: number
  max: number
  detail: string
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
  categoryKey: string
  categoryIcon: CategoryConfig['icon']
  color: string
  style: string
  time: number
  points: number | null
  scoreBefore: number
  score: number
}

export type ProfileCategoryDisplay = {
  key: string
  label: string
  fullLabel: string
  icon: CategoryConfig['icon']
  color: string
  style: string
}

export type ActivityDomain = {
  start: number
  end: number
  bucketSize: number
}

type CategoryBarMetrics = {
  value: number
  max: number
  detail: string
  segments?: CategoryBarSegment[]
  fullClear?: boolean
  fullClearValue?: number
}

const msPerMinute = 60 * 1000
const msPerHour = 60 * msPerMinute
const msPerDay = 24 * msPerHour

const targetCadenceBuckets = 8

type DifficultyBin = {
  key: string
  label: string
  accepts: (solveCount: number) => boolean
}

const difficultyBins: DifficultyBin[] = [
  { key: 'solo', label: '1 solve', accepts: solveCount => solveCount === 1 },
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

export function isDynamicChallenge(challenge: {
  scoringKind?: 'decay' | 'dynamic'
}): boolean {
  return challenge.scoringKind === 'dynamic'
}

export function buildCategoryStats({
  challenges,
  solves,
  dynamicScores = [],
}: {
  challenges: ChallengeInfo[]
  solves: ProfileSolve[]
  dynamicScores?: ProfileDynamicScore[]
}): CategoryStat[] {
  const stats = new Map<string, CategoryStat>()
  const dynamicScoreByChallenge = new Map(
    dynamicScores.map(score => [score.id, score])
  )
  const staticChallenges = challenges.filter(
    challenge => !isDynamicChallenge(challenge)
  )
  const challengeIds = new Set(staticChallenges.map(challenge => challenge.id))

  for (const challenge of challenges) {
    const stat = getOrCreateCategoryStat(stats, challenge.category)

    if (isDynamicChallenge(challenge)) {
      const score = dynamicScoreByChallenge.get(challenge.id)
      const points = score?.points ?? 0
      stat.pointsTotal += points
      stat.pointsEarned += points
      stat.dynamicPointsEarned += points
      continue
    }

    stat.staticTotal += 1
    stat.pointsTotal += challenge.points
    stat.staticPointsTotal += challenge.points
  }

  for (const solve of solves) {
    const stat = getOrCreateCategoryStat(stats, solve.category)
    // When a solve points at a challenge missing from the current snapshot
    // (deleted/hidden), count it toward the total too so the bar isn't >100%.
    if (challenges.length === 0 || !challengeIds.has(solve.id)) {
      stat.staticTotal += 1
      stat.pointsTotal += solve.points ?? 0
      stat.staticPointsTotal += solve.points ?? 0
    }
    stat.solved += 1
    stat.pointsEarned += solve.points ?? 0
  }

  return Array.from(stats.values()).sort(compareCategoryStats)
}

export function getProfileCategoryDisplay(
  category: string
): ProfileCategoryDisplay {
  const config = getCategoryConfig(category)
  const key = getCategoryKeyOrAlias(category)

  return {
    key,
    label: key,
    fullLabel: config.name,
    icon: config.icon,
    color: `var(--foreground-${config.color}-l1)`,
    style: getCategoryStyle(config.color),
  }
}

export function buildCategoryPointsData(
  stats: CategoryStat[],
  solves: ProfileSolve[] = [],
  challenges: ChallengeInfo[] = [],
  dynamicScores: ProfileDynamicScore[] = []
): CategoryBarDatum[] {
  const segmentsByCategory = buildPointSegments(
    solves,
    challenges,
    dynamicScores
  )

  return buildCategoryBarData(stats, stat => ({
    value: stat.pointsTotal,
    max: stat.pointsTotal,
    detail: formatPointsDetail(stat),
    segments: segmentsByCategory.get(stat.key),
    fullClear: hasStaticFullClear(stat),
    fullClearValue: stat.staticPointsTotal,
  }))
}

export function buildDifficultyData({
  challenges,
  solves,
}: {
  challenges: ChallengeInfo[]
  solves: ProfileSolve[]
}): DifficultyDatum[] {
  return difficultyBins.map(bin => {
    const solvesInBin = solves.filter(solve =>
      bin.accepts(normalizeSolvedChallengeSolveCount(solve.solves))
    )
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
  let score = 0

  return solves.map(solve => {
    const category = getProfileCategoryDisplay(solve.category)
    const points = solve.awardedPoints ?? solve.points
    score += points ?? 0

    return {
      key: solve.id,
      name: solve.name,
      categoryLabel: category.label,
      categoryKey: category.key,
      categoryIcon: category.icon,
      color: category.color,
      style: category.style,
      time: solve.createdAt,
      points,
      scoreBefore: score - (points ?? 0),
      score,
    }
  })
}

export function buildTimelineCategories(
  data: TimelineDatum[],
  stats: CategoryStat[]
): string[] {
  const statByLabel = new Map(stats.map(stat => [stat.label, stat]))
  return Array.from(new Set(data.map(item => item.categoryLabel))).sort(
    (a, b) =>
      compareCategoryNames(
        a,
        b,
        statByLabel.get(a)?.category,
        statByLabel.get(b)?.category
      )
  )
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
): CategoryBarDatum[] {
  return stats.map(stat => {
    const metrics = getMetrics(stat)
    return {
      key: stat.key,
      label: stat.label,
      icon: stat.icon,
      value: metrics.value,
      max: Math.max(metrics.max, 1),
      style: stat.style,
      tooltipLabel: stat.fullLabel,
      detail: metrics.detail,
      segments: metrics.segments,
      fullClear: metrics.fullClear,
      fullClearValue: metrics.fullClearValue,
    }
  })
}

function buildPointSegments(
  solves: ProfileSolve[],
  challenges: ChallengeInfo[],
  dynamicScores: ProfileDynamicScore[]
): Map<string, CategoryBarSegment[]> {
  type PendingSegment = Omit<CategoryBarSegment, 'start' | 'end'>

  const solvedSegments = new Map<string, PendingSegment[]>()
  const dynamicSegments = new Map<string, PendingSegment[]>()
  const unsolvedSegments = new Map<string, PendingSegment[]>()
  const solvedIds = new Set(solves.map(solve => solve.id))

  for (const solve of solves) {
    const value = solve.points ?? 0
    if (value <= 0) continue

    const categoryKey = getCategoryKeyOrAlias(solve.category)
    const list = solvedSegments.get(categoryKey) ?? []
    list.push({ key: solve.id, label: solve.name, value })
    solvedSegments.set(categoryKey, list)
  }

  const dynamicScoreByChallenge = new Map(
    dynamicScores.map(score => [score.id, score])
  )
  for (const challenge of challenges) {
    if (!isDynamicChallenge(challenge)) continue

    const value = dynamicScoreByChallenge.get(challenge.id)?.points ?? 0
    if (value <= 0) continue

    const categoryKey = getCategoryKeyOrAlias(challenge.category)
    const list = dynamicSegments.get(categoryKey) ?? []
    list.push({
      key: challenge.id,
      label: challenge.name,
      value,
      detail: `${value.toLocaleString()} dynamic pts`,
      hatched: true,
    })
    dynamicSegments.set(categoryKey, list)
  }

  for (const challenge of challenges) {
    if (isDynamicChallenge(challenge) || solvedIds.has(challenge.id)) continue
    if (challenge.points <= 0) continue

    const categoryKey = getCategoryKeyOrAlias(challenge.category)
    const list = unsolvedSegments.get(categoryKey) ?? []
    list.push({
      key: challenge.id,
      label: challenge.name,
      value: challenge.points,
      detail: `${challenge.points.toLocaleString()} pts`,
      muted: true,
    })
    unsolvedSegments.set(categoryKey, list)
  }

  const result = new Map<string, CategoryBarSegment[]>()
  const categoryKeys = new Set([
    ...solvedSegments.keys(),
    ...dynamicSegments.keys(),
    ...unsolvedSegments.keys(),
  ])

  for (const categoryKey of categoryKeys) {
    const list: CategoryBarSegment[] = []
    let total = 0

    for (const segment of (solvedSegments.get(categoryKey) ?? []).toSorted(
      comparePendingSegments
    )) {
      const start = total
      total += segment.value
      list.push({ ...segment, start, end: total })
    }

    for (const segment of (dynamicSegments.get(categoryKey) ?? []).toSorted(
      comparePendingSegments
    )) {
      const start = total
      total += segment.value
      list.push({ ...segment, start, end: total })
    }

    for (const segment of (unsolvedSegments.get(categoryKey) ?? []).toSorted(
      comparePendingSegments
    )) {
      const start = total
      total += segment.value
      list.push({ ...segment, start, end: total })
    }

    result.set(categoryKey, list)
  }

  return result
}

function comparePendingSegments(
  a: Omit<CategoryBarSegment, 'start' | 'end'>,
  b: Omit<CategoryBarSegment, 'start' | 'end'>
): number {
  return a.value - b.value || a.label.localeCompare(b.label)
}

function getOrCreateCategoryStat(
  stats: Map<string, CategoryStat>,
  category: string
): CategoryStat {
  const categoryDisplay = getProfileCategoryDisplay(category)
  const existing = stats.get(categoryDisplay.key)
  if (existing) return existing

  const stat = {
    key: categoryDisplay.key,
    label: categoryDisplay.label,
    fullLabel: categoryDisplay.fullLabel,
    icon: categoryDisplay.icon,
    style: categoryDisplay.style,
    category,
    staticTotal: 0,
    solved: 0,
    pointsTotal: 0,
    staticPointsTotal: 0,
    pointsEarned: 0,
    dynamicPointsEarned: 0,
  }
  stats.set(categoryDisplay.key, stat)
  return stat
}

function compareCategoryStats(a: CategoryStat, b: CategoryStat): number {
  return compareCategoryNames(a.label, b.label, a.category, b.category)
}

function hasStaticFullClear(stat: CategoryStat): boolean {
  return stat.staticTotal > 0 && stat.solved >= stat.staticTotal
}

function formatPointsDetail(stat: CategoryStat): string {
  if (stat.dynamicPointsEarned === 0) {
    return `${stat.pointsEarned.toLocaleString()}/${stat.pointsTotal.toLocaleString()} pts`
  }

  const staticPointsEarned = stat.pointsEarned - stat.dynamicPointsEarned
  if (stat.staticPointsTotal === 0) {
    return `${stat.dynamicPointsEarned.toLocaleString()} dynamic pts`
  }

  return [
    `${staticPointsEarned.toLocaleString()}/${stat.staticPointsTotal.toLocaleString()} static pts`,
    `${stat.dynamicPointsEarned.toLocaleString()} dynamic pts`,
  ].join(' + ')
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

function normalizeSolvedChallengeSolveCount(solveCount: number | null): number {
  return Math.max(solveCount ?? 1, 1)
}

function chooseCadenceBucketSize(duration: number): number {
  const targetBucketSize = duration / targetCadenceBuckets
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
