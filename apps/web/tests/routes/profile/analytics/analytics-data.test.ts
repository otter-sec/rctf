import type { ClientConfig } from '@rctf/types'
import {
  buildActivityDomain,
  buildCadenceData,
  buildCategoryPointsData,
  buildCategoryStats,
  buildDifficultyData,
  buildTimelineCategories,
  buildTimelineData,
  getProfileCategoryDisplay,
  isDynamicChallenge,
  maxChartValue,
  sortProfileSolves,
  type ChallengeInfo,
  type ProfileDynamicScore,
  type ProfileSolve,
} from '$routes/profile/analytics/analytics-data'
import { describe, expect, test } from 'bun:test'

const msPerMinute = 60 * 1000
const msPerHour = 60 * msPerMinute
const msPerDay = 24 * msPerHour

function solve(
  overrides: Partial<ProfileSolve> & { id: string }
): ProfileSolve {
  return {
    category: 'web',
    name: overrides.id,
    points: 100,
    awardedPoints: null,
    solves: 1,
    createdAt: 0,
    bloodIndex: null,
    ...overrides,
  }
}

function challenge(
  overrides: Partial<ChallengeInfo> & { id: string }
): ChallengeInfo {
  return {
    name: overrides.id,
    category: 'web',
    points: 100,
    solves: 1,
    ...overrides,
  }
}

function dynamicScore(id: string, points: number): ProfileDynamicScore {
  return { id, points, pointDelta: 0 }
}

function clientConfig(startTime: number, endTime: number): ClientConfig {
  return { startTime, endTime } as unknown as ClientConfig
}

describe('sortProfileSolves', () => {
  test('sorts ascending by createdAt without mutating the input', () => {
    const input = [
      solve({ id: 'c', createdAt: 30 }),
      solve({ id: 'a', createdAt: 10 }),
      solve({ id: 'b', createdAt: 20 }),
    ]
    const sorted = sortProfileSolves(input)

    expect(sorted.map(s => s.id)).toEqual(['a', 'b', 'c'])
    expect(input.map(s => s.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('isDynamicChallenge', () => {
  test('true only for the dynamic scoring kind', () => {
    expect(isDynamicChallenge({ scoringKind: 'dynamic' })).toBe(true)
    expect(isDynamicChallenge({ scoringKind: 'decay' })).toBe(false)
    expect(isDynamicChallenge({})).toBe(false)
  })
})

describe('getProfileCategoryDisplay', () => {
  test('resolves aliases and carries the category hue', () => {
    const display = getProfileCategoryDisplay('rev')

    expect(display.key).toBe('reverse')
    expect(display.label).toBe('reverse')
    expect(display.fullLabel).toBe('Reverse Engineering')
    expect(display.color).toBe('orange')
  })
})

describe('buildCategoryStats', () => {
  test('pads totals with orphan solves so bars never exceed 100%', () => {
    const stats = buildCategoryStats({
      challenges: [challenge({ id: 'web-1', category: 'web', points: 100 })],
      solves: [
        solve({ id: 'web-1', category: 'web', points: 100 }),
        solve({ id: 'orphan', category: 'web', points: 50 }),
      ],
    })

    const web = stats.find(stat => stat.key === 'web')!
    expect(web.staticTotal).toBe(2)
    expect(web.solved).toBe(2)
    expect(web.pointsTotal).toBe(150)
    expect(web.staticPointsTotal).toBe(150)
    expect(web.pointsEarned).toBe(150)
    expect(web.solved).toBeLessThanOrEqual(web.staticTotal)
  })

  test('folds dynamic challenge points without incrementing solved or static totals', () => {
    const stats = buildCategoryStats({
      challenges: [
        challenge({ id: 'web-dyn', category: 'web', scoringKind: 'dynamic' }),
      ],
      solves: [],
      dynamicScores: [dynamicScore('web-dyn', 200)],
    })

    const web = stats.find(stat => stat.key === 'web')!
    expect(web.staticTotal).toBe(0)
    expect(web.solved).toBe(0)
    expect(web.pointsTotal).toBe(200)
    expect(web.pointsEarned).toBe(200)
    expect(web.dynamicPointsEarned).toBe(200)
  })

  test('empty inputs produce an empty array', () => {
    expect(buildCategoryStats({ challenges: [], solves: [] })).toEqual([])
  })
})

describe('buildCategoryPointsData', () => {
  test('orders segments solved then dynamic then unsolved, each ascending by value', () => {
    const challenges = [
      challenge({ id: 'web-a', category: 'web', points: 100 }),
      challenge({ id: 'web-b', category: 'web', points: 50 }),
      challenge({ id: 'web-dyn', category: 'web', scoringKind: 'dynamic' }),
      challenge({ id: 'web-unsolved', category: 'web', points: 70 }),
    ]
    const solves = [
      solve({ id: 'web-a', category: 'web', points: 100 }),
      solve({ id: 'web-b', category: 'web', points: 50 }),
    ]
    const dynamicScores = [dynamicScore('web-dyn', 30)]

    const stats = buildCategoryStats({ challenges, solves, dynamicScores })
    const data = buildCategoryPointsData(
      stats,
      solves,
      challenges,
      dynamicScores
    )

    const web = data.find(datum => datum.key === 'web')!
    const segments = web.segments!
    expect(segments.map(s => s.value)).toEqual([50, 100, 30, 70])
    expect(segments.map(s => s.start)).toEqual([0, 50, 150, 180])
    expect(segments.map(s => s.end)).toEqual([50, 150, 180, 250])
    expect(segments[2]!.hatched).toBe(true)
    expect(segments[3]!.muted).toBe(true)
  })

  test('full-clear flag is set only when all static challenges are solved', () => {
    const challenges = [
      challenge({ id: 'web-a', category: 'web' }),
      challenge({ id: 'web-b', category: 'web' }),
      challenge({ id: 'crypto-a', category: 'crypto' }),
      challenge({ id: 'crypto-b', category: 'crypto' }),
    ]
    const solves = [
      solve({ id: 'web-a', category: 'web' }),
      solve({ id: 'web-b', category: 'web' }),
      solve({ id: 'crypto-a', category: 'crypto' }),
    ]

    const stats = buildCategoryStats({ challenges, solves })
    const data = buildCategoryPointsData(stats, solves, challenges)

    expect(data.find(d => d.key === 'web')!.fullClear).toBe(true)
    expect(data.find(d => d.key === 'crypto')!.fullClear).toBe(false)
  })

  test('empty stats produce an empty array', () => {
    expect(buildCategoryPointsData([])).toEqual([])
  })
})

describe('buildDifficultyData', () => {
  test('bins solves at the 1 / 2-5 / 6-20 / 21-50 / 51+ boundaries', () => {
    const solves = [1, 2, 5, 6, 20, 21, 50, 51].map((count, index) =>
      solve({ id: `s-${index}`, solves: count })
    )

    const data = buildDifficultyData({ challenges: [], solves })
    const byKey = new Map(data.map(datum => [datum.key, datum.value]))

    expect(byKey.get('solo')).toBe(1)
    expect(byKey.get('rare')).toBe(2)
    expect(byKey.get('hard')).toBe(2)
    expect(byKey.get('medium')).toBe(2)
    expect(byKey.get('common')).toBe(1)
  })

  test('empty inputs return the five zero-valued bins', () => {
    const data = buildDifficultyData({ challenges: [], solves: [] })
    expect(data).toHaveLength(5)
    expect(data.every(datum => datum.value === 0)).toBe(true)
    expect(data.every(datum => !Number.isNaN(datum.max))).toBe(true)
  })
})

describe('buildActivityDomain', () => {
  const start = 1_000_000
  const end = start + 10 * msPerDay

  test('empty solves anchor at CTF start with an hour bucket', () => {
    const domain = buildActivityDomain({
      clientConfig: clientConfig(start, end),
      solves: [],
    })
    expect(domain.start).toBe(start)
    expect(domain.bucketSize).toBe(msPerHour)
    expect(domain.end).toBe(start + msPerHour)
  })

  test('a 15-minute span keeps buckets small and at most eight', () => {
    const solves = [
      solve({ id: 'a', createdAt: start }),
      solve({ id: 'b', createdAt: start + 15 * msPerMinute }),
    ]
    const domain = buildActivityDomain({
      clientConfig: clientConfig(start, end),
      solves,
    })
    expect(domain.start).toBe(start)
    expect(domain.bucketSize).toBe(15 * msPerMinute)
    const bucketCount = Math.ceil(
      (domain.end - domain.start) / domain.bucketSize
    )
    expect(bucketCount).toBeLessThanOrEqual(8)
  })

  test('a 3-day span picks a 12-hour bucket and stays at most eight buckets', () => {
    const solves = [
      solve({ id: 'a', createdAt: start }),
      solve({ id: 'b', createdAt: start + 3 * msPerDay }),
    ]
    const domain = buildActivityDomain({
      clientConfig: clientConfig(start, end),
      solves,
    })
    expect(domain.start).toBe(start)
    expect(domain.bucketSize).toBe(12 * msPerHour)
    const bucketCount = Math.ceil(
      (domain.end - domain.start) / domain.bucketSize
    )
    expect(bucketCount).toBeLessThanOrEqual(8)
  })
})

describe('buildCadenceData', () => {
  const start = 0

  test('counts solves into their buckets and ignores out-of-domain solves', () => {
    const domain = { start, end: start + 4 * msPerHour, bucketSize: msPerHour }
    const solves = [
      solve({ id: 'a', createdAt: start + 10 * msPerMinute }),
      solve({ id: 'b', createdAt: start + 40 * msPerMinute }),
      solve({ id: 'c', createdAt: start + 90 * msPerMinute }),
      solve({ id: 'out', createdAt: start + 10 * msPerHour }),
    ]

    const buckets = buildCadenceData({ ctfStart: start, domain, solves })
    expect(buckets).toHaveLength(4)
    expect(buckets[0]!.count).toBe(2)
    expect(buckets[1]!.count).toBe(1)
    expect(buckets[2]!.count).toBe(0)
  })

  test('empty solves yield zero-count buckets', () => {
    const domain = { start, end: start + 2 * msPerHour, bucketSize: msPerHour }
    const buckets = buildCadenceData({ ctfStart: start, domain, solves: [] })
    expect(buckets.every(bucket => bucket.count === 0)).toBe(true)
  })
})

describe('buildTimelineData', () => {
  test('accumulates awardedPoints ?? points in solve order', () => {
    const solves = [
      solve({ id: 'a', category: 'web', awardedPoints: 100, points: 500 }),
      solve({ id: 'b', category: 'crypto', awardedPoints: null, points: 50 }),
      solve({ id: 'c', category: 'web', awardedPoints: 30, points: 999 }),
    ]

    const data = buildTimelineData(solves)
    expect(data.map(d => d.points)).toEqual([100, 50, 30])
    expect(data.map(d => d.scoreBefore)).toEqual([0, 100, 150])
    expect(data.map(d => d.score)).toEqual([100, 150, 180])
    expect(data[0]!.color).toBe('sky')
  })

  test('empty solves produce an empty timeline', () => {
    expect(buildTimelineData([])).toEqual([])
  })
})

describe('buildTimelineCategories', () => {
  test('orders category labels by canonical category order', () => {
    const solves = [
      solve({ id: 'a', category: 'web' }),
      solve({ id: 'b', category: 'crypto' }),
      solve({ id: 'c', category: 'pwn' }),
    ]
    const data = buildTimelineData(solves)
    const stats = buildCategoryStats({ challenges: [], solves })

    expect(buildTimelineCategories(data, stats)).toEqual([
      'pwn',
      'crypto',
      'web',
    ])
  })
})

describe('maxChartValue', () => {
  test('returns at least one and the largest mapped value', () => {
    expect(maxChartValue([], () => 0)).toBe(1)
    expect(maxChartValue([3, 7, 2], value => value)).toBe(7)
  })
})
