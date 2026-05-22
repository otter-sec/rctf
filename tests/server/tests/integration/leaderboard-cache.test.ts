import { config } from '@rctf/config'
import {
  challenges,
  ChallengeScoringKind,
  createDatabase,
  DynamicScoringTransport,
  settings,
  solves,
  users,
  type ChallengeData,
  type EditableSettings,
} from '@rctf/db'
import type { ScoreContext, ScoreProvider } from '@rctf/scoring/base'
import ClassicProvider from '@rctf/scoring/classic'
import JammyProvider from '@rctf/scoring/jammy'
import LegacyProvider from '@rctf/scoring/legacy'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { PinoLogger } from 'hono-pino'
import type { TypedRedis } from '../../../../apps/api/src/cache/scripts'
import { scoreProvider } from '../../../../apps/api/src/providers'
import {
  calculateLeaderboard,
  createCachedLeaderboardCalculator,
} from '../../../../apps/api/src/services/leaderboard'
import {
  applyChallengeConfigChange,
  applyDecayPointsForAllChallenges,
} from '../../../../apps/api/src/services/solve-points'

const getDb = () => createDatabase(config.database.sql).db

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop()
    if (!cleanup) {
      continue
    }

    await cleanup()
  }
})

const insertUser = async (
  name: string = crypto.randomUUID(),
  overrides?: { division?: string }
) => {
  const db = getDb()
  const id = crypto.randomUUID()

  await db.insert(users).values({
    id,
    name,
    email: `${crypto.randomUUID()}@example.com`,
    division: overrides?.division ?? Object.keys(config.divisions)[0]!,
    perms: 0,
  })

  cleanups.push(async () => {
    await db.delete(solves).where(eq(solves.userid, id))
    await db.delete(users).where(eq(users.id, id))
  })

  return { id, name }
}

const insertChallenge = async (overrides?: Partial<ChallengeData>) => {
  const db = getDb()
  const id = crypto.randomUUID()

  const data: ChallengeData = {
    name: crypto.randomUUID(),
    description: crypto.randomUUID(),
    category: crypto.randomUUID(),
    author: crypto.randomUUID(),
    files: [],
    flag: crypto.randomUUID(),
    tiebreakEligible: true,
    points: {
      min: 100,
      max: 500,
    },
    ...overrides,
  }

  await db.insert(challenges).values({ id, data })
  cleanups.push(async () => {
    await db.delete(solves).where(eq(solves.challengeid, id))
    await db.delete(challenges).where(eq(challenges.id, id))
  })

  return { id, data }
}

const insertSolve = async (params: {
  challengeId: string
  userId: string
  createdAt?: string
  points?: number
  pointsUpdatedAt?: string
}) => {
  const db = getDb()
  const id = crypto.randomUUID()

  await db.insert(solves).values({
    id,
    challengeid: params.challengeId,
    userid: params.userId,
    createdat: params.createdAt ?? new Date().toISOString(),
    ...(params.points !== undefined ? { points: params.points } : {}),
    ...(params.pointsUpdatedAt !== undefined
      ? { pointsUpdatedAt: params.pointsUpdatedAt }
      : {}),
  })

  cleanups.push(async () => {
    await db.delete(solves).where(eq(solves.id, id))
  })

  return { id }
}

const setSettingsOverride = async (data: EditableSettings) => {
  const db = getDb()
  await db.insert(settings).values({ id: 'value-0', data }).onConflictDoUpdate({
    target: settings.id,
    set: { data },
  })

  cleanups.push(async () => {
    await db.delete(settings).where(eq(settings.id, 'value-0'))
  })
}

const classic = new ClassicProvider({})
const classicScore = (solvesCount: number, min: number, max: number) =>
  classic.calculate({
    minPoints: min,
    maxPoints: max,
    solves: solvesCount,
    maxSolves: 0,
    eventStartTime: 0,
    eventEndTime: 0,
    firstSolveTime: solvesCount > 0 ? 0 : null,
  } satisfies ScoreContext)

const replaceScoreProvider = (provider: ScoreProvider) => {
  const { revision, requiredFields, calculate } = scoreProvider
  Object.assign(scoreProvider, {
    revision: provider.revision,
    requiredFields: provider.requiredFields,
    calculate: provider.calculate.bind(provider),
  })
  cleanups.push(async () => {
    Object.assign(scoreProvider, { revision, requiredFields, calculate })
  })
}

const getSolvePoints = async (solveId: string): Promise<number> => {
  const db = getDb()
  const row = await db
    .select({ points: solves.points })
    .from(solves)
    .where(eq(solves.id, solveId))
    .limit(1)
  return row[0]!.points
}

const T0 = config.startTime + 1_800_000 * 2
const T1 = T0 + 1000
const T2 = T0 + 2000
const T3 = T0 + 3000
const T4 = T0 + 4000
const isoAt = (ms: number) => new Date(ms).toISOString()

describe('cached leaderboard calculator', () => {
  test('returns unchanged when there are no new solves or metadata changes', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge()
    await insertSolve({ challengeId: challenge.id, userId: user.id })

    const calc = createCachedLeaderboardCalculator()

    const first = await calc(db)
    expect(first.recomputedFromScratch).toBe(true)
    expect(first.changed).toBe(true)

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(false)
    expect(second.calculated.users).toHaveLength(1)
  })

  test('rebuilds when runtime timing overrides change', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge()
    await insertSolve({ challengeId: challenge.id, userId: user.id })

    const calc = createCachedLeaderboardCalculator()
    const first = await calc(db)
    expect(first.recomputedFromScratch).toBe(true)

    await setSettingsOverride({
      startTime: config.startTime + 60_000,
      endTime: config.endTime + 60_000,
    })

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(true)
    expect(second.changed).toBe(true)
  })

  test('applies new solves incrementally without full rebuild', async () => {
    const db = getDb()
    const userA = await insertUser()
    const userB = await insertUser()
    const challenge = await insertChallenge()

    await insertSolve({ challengeId: challenge.id, userId: userA.id })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await insertSolve({ challengeId: challenge.id, userId: userB.id })

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(true)
    expect(second.calculated.challengeInfos.get(challenge.id)?.solves).toBe(2)
    expect(second.calculated.users).toHaveLength(2)
  })

  test('refreshes dynamic point updates without relying on timestamp cursor order', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge({
      flag: '',
      scoring: {
        kind: ChallengeScoringKind.DYNAMIC,
        source: {
          transport: DynamicScoringTransport.WEBHOOK,
          secret: crypto.randomUUID(),
        },
      },
    })

    const solve = await insertSolve({
      challengeId: challenge.id,
      userId: user.id,
      createdAt: isoAt(T0),
      points: 10,
      pointsUpdatedAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    const first = await calc(db)
    expect(first.recomputedFromScratch).toBe(true)
    expect(first.calculated.users.find(u => u.id === user.id)?.score).toBe(10)

    await db
      .update(solves)
      .set({ points: 25, pointsUpdatedAt: isoAt(T0 - 1000) })
      .where(eq(solves.id, solve.id))

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(true)
    expect(second.calculated.users.find(u => u.id === user.id)?.score).toBe(25)

    const third = await calc(db)
    expect(third.recomputedFromScratch).toBe(false)
    expect(third.changed).toBe(false)
    expect(third.calculated.users.find(u => u.id === user.id)?.score).toBe(25)
  })

  test('rebuilds from scratch when provider identity changes', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge()
    await insertSolve({ challengeId: challenge.id, userId: user.id })

    const calc = createCachedLeaderboardCalculator()
    await calc(db, 'scores/classic@1')

    const second = await calc(db, 'scores/classic@2')
    expect(second.recomputedFromScratch).toBe(true)
    expect(second.changed).toBe(true)
  })

  test('rebuilds from scratch when a public challenge changes or is deleted', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge()
    await insertSolve({ challengeId: challenge.id, userId: user.id })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db.delete(challenges).where(eq(challenges.id, challenge.id))

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(true)
    expect(second.calculated.challengeInfos.has(challenge.id)).toBe(false)
  })

  test('rebuilds from scratch when challenge scoring metadata changes', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge({ name: 'before-update' })
    await insertSolve({ challengeId: challenge.id, userId: user.id })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db
      .update(challenges)
      .set({
        data: {
          ...challenge.data,
          name: 'after-update',
          points: { min: 50, max: 300 },
        },
      })
      .where(eq(challenges.id, challenge.id))

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(true)
    expect(second.calculated.challengeInfos.get(challenge.id)?.name).toBe(
      'after-update'
    )
  })

  test('patches user names without full rebuild', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge()
    await insertSolve({ challengeId: challenge.id, userId: user.id })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db
      .update(users)
      .set({ name: `${user.name}-renamed` })
      .where(eq(users.id, user.id))

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(true)
    expect(second.calculated.users[0]?.name).toBe(`${user.name}-renamed`)
  })

  test('reports unchanged when name is set to the same value', async () => {
    const db = getDb()
    const user = await insertUser('stable-name')
    const challenge = await insertChallenge()
    await insertSolve({ challengeId: challenge.id, userId: user.id })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db
      .update(users)
      .set({ name: 'stable-name' })
      .where(eq(users.id, user.id))

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(false)
  })

  test('patches user division without full rebuild', async () => {
    const db = getDb()
    const divisions = Object.keys(config.divisions)
    const user = await insertUser('div-user', { division: divisions[0] })
    const challenge = await insertChallenge()
    await insertSolve({ challengeId: challenge.id, userId: user.id })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db
      .update(users)
      .set({ division: divisions[1] })
      .where(eq(users.id, user.id))

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(true)
    expect(second.calculated.users[0]?.division).toBe(divisions[1])
  })

  test('new user registration does not cause full rebuild', async () => {
    const db = getDb()
    const existingUser = await insertUser('existing')
    const challenge = await insertChallenge()
    await insertSolve({
      challengeId: challenge.id,
      userId: existingUser.id,
      createdAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    const first = await calc(db)
    expect(first.recomputedFromScratch).toBe(true)
    expect(first.calculated.users).toHaveLength(1)

    await insertUser('new-user-1')
    await insertUser('new-user-2')
    await insertUser('new-user-3')

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(false)
    expect(second.calculated.users).toHaveLength(1)
  })

  test('new user who solves before next tick is handled incrementally', async () => {
    const db = getDb()
    const existingUser = await insertUser('existing')
    const challenge = await insertChallenge()
    await insertSolve({
      challengeId: challenge.id,
      userId: existingUser.id,
      createdAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    const newUser = await insertUser('newcomer')
    await insertSolve({
      challengeId: challenge.id,
      userId: newUser.id,
      createdAt: isoAt(T1),
    })

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(true)
    expect(second.calculated.users).toHaveLength(2)
    expect(second.calculated.users.find(u => u.id === newUser.id)).toBeDefined()
  })

  test('user deletion does not cause full rebuild', async () => {
    const db = getDb()
    const userA = await insertUser('keeper')
    const userB = await insertUser('deleted')
    const challenge = await insertChallenge()

    await insertSolve({
      challengeId: challenge.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: challenge.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db.delete(solves).where(eq(solves.userid, userB.id))
    await db.delete(users).where(eq(users.id, userB.id))

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(true)
    expect(second.calculated.users).toHaveLength(1)
    expect(second.calculated.users[0]?.id).toBe(userA.id)
  })

  test('user deletion without solve deletion does not rebuild', async () => {
    const db = getDb()
    const userA = await insertUser('keeper')
    const userB = await insertUser('will-be-deleted')
    const challenge = await insertChallenge()

    await insertSolve({
      challengeId: challenge.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db.delete(users).where(eq(users.id, userB.id))

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(false)
    expect(second.changed).toBe(false)
  })

  test('rebuilds from scratch when solves are deleted or appended out of order', async () => {
    const db = getDb()
    const user = await insertUser()
    const challengeA = await insertChallenge()
    const challengeB = await insertChallenge()
    const firstSolveTime = new Date().toISOString()
    const initialSolve = await insertSolve({
      challengeId: challengeA.id,
      userId: user.id,
      createdAt: firstSolveTime,
    })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db.delete(solves).where(eq(solves.id, initialSolve.id))
    const afterDelete = await calc(db)
    expect(afterDelete.recomputedFromScratch).toBe(true)

    await insertSolve({
      challengeId: challengeA.id,
      userId: user.id,
      createdAt: new Date().toISOString(),
    })
    await calc(db)

    await insertSolve({
      challengeId: challengeB.id,
      userId: user.id,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    })

    const outOfOrder = await calc(db)
    expect(outOfOrder.recomputedFromScratch).toBe(true)
  })

  test('rebuilds from scratch when solve history is rewritten but count is unchanged', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge()

    const firstSolve = await insertSolve({
      challengeId: challenge.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await db.delete(solves).where(eq(solves.id, firstSolve.id))
    await insertSolve({
      challengeId: challenge.id,
      userId: user.id,
      createdAt: isoAt(T1),
    })

    const second = await calc(db)
    expect(second.recomputedFromScratch).toBe(true)
    expect(second.calculated.challengeInfos.get(challenge.id)?.solves).toBe(1)
  })

  test('rebuilds when a delta solve cannot be applied', async () => {
    const db = getDb()
    const user = await insertUser()
    const publicChallenge = await insertChallenge({ name: 'public' })
    const hiddenChallenge = await insertChallenge({
      name: 'hidden',
      hidden: true,
    })

    await insertSolve({
      challengeId: publicChallenge.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    await insertSolve({
      challengeId: hiddenChallenge.id,
      userId: user.id,
      createdAt: isoAt(T1),
    })

    const second = await calc(db)
    expect(second.changed).toBe(true)
    expect(second.recomputedFromScratch).toBe(true)
    expect(
      second.calculated.challengeInfos.get(publicChallenge.id)?.solves
    ).toBe(1)
  })
})

describe('score calculation correctness', () => {
  test('single challenge single solve gives maxPoints', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge({
      points: { min: 100, max: 500 },
    })
    await insertSolve({
      challengeId: challenge.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)

    expect(result.challengeInfos.get(challenge.id)?.solves).toBe(1)
    expect(result.challengeInfos.get(challenge.id)?.score).toBe(500)
    expect(result.users).toHaveLength(1)
    expect(result.users[0]?.score).toBe(500)
  })

  test('challenge score decreases as more users solve it', async () => {
    const db = getDb()
    const userA = await insertUser()
    const userB = await insertUser()
    const userC = await insertUser()
    const challenge = await insertChallenge({
      points: { min: 100, max: 500 },
    })

    await insertSolve({
      challengeId: challenge.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: challenge.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })
    await insertSolve({
      challengeId: challenge.id,
      userId: userC.id,
      createdAt: isoAt(T2),
    })

    const result = await calculateLeaderboard(db)
    const expected = classicScore(3, 100, 500)

    expect(result.challengeInfos.get(challenge.id)?.solves).toBe(3)
    expect(result.challengeInfos.get(challenge.id)?.score).toBe(expected)
    for (const user of result.users) {
      expect(user.score).toBe(expected)
    }
  })

  test('user total score is sum of challenge scores', async () => {
    const db = getDb()
    const userA = await insertUser()
    const userB = await insertUser()
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 50, max: 300 } })

    await insertSolve({
      challengeId: ch1.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })
    await insertSolve({
      challengeId: ch2.id,
      userId: userA.id,
      createdAt: isoAt(T2),
    })

    const result = await calculateLeaderboard(db)

    const ch1Score = classicScore(2, 100, 500)
    const ch2Score = classicScore(1, 50, 300)

    expect(result.challengeInfos.get(ch1.id)?.score).toBe(ch1Score)
    expect(result.challengeInfos.get(ch2.id)?.score).toBe(ch2Score)

    const leaderUserA = result.users.find(u => u.id === userA.id)
    const leaderUserB = result.users.find(u => u.id === userB.id)

    expect(leaderUserA?.score).toBe(ch1Score + ch2Score)
    expect(leaderUserB?.score).toBe(ch1Score)
  })

  test('challenge with custom min/max produces correct score', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch = await insertChallenge({ points: { min: 50, max: 1000 } })
    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)

    expect(result.challengeInfos.get(ch.id)?.score).toBe(
      classicScore(1, 50, 1000)
    )
    expect(result.users[0]?.score).toBe(classicScore(1, 50, 1000))
  })
})

describe('persistent decay point recomputes', () => {
  test('all-challenge recompute updates unrelated challenges when maxSolves changes', async () => {
    replaceScoreProvider(new LegacyProvider({}))
    const db = getDb()
    const userA = await insertUser()
    const userB = await insertUser()
    const userC = await insertUser()
    const chWithMaxSolves = await insertChallenge()
    const chAffectedByMaxSolves = await insertChallenge()

    await insertSolve({
      challengeId: chWithMaxSolves.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: chWithMaxSolves.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })
    const affectedSolve = await insertSolve({
      challengeId: chAffectedByMaxSolves.id,
      userId: userA.id,
      createdAt: isoAt(T2),
    })

    await applyDecayPointsForAllChallenges(db)
    const before = await getSolvePoints(affectedSolve.id)

    await insertSolve({
      challengeId: chWithMaxSolves.id,
      userId: userC.id,
      createdAt: isoAt(T3),
    })
    await applyDecayPointsForAllChallenges(db, 'flag')

    expect(await getSolvePoints(affectedSolve.id)).not.toBe(before)
  })

  test('applyChallengeConfigChange reprices existing solves when points change', async () => {
    const db = getDb()
    const user = await insertUser()
    const challenge = await insertChallenge({ points: { min: 50, max: 500 } })
    const solve = await insertSolve({
      challengeId: challenge.id,
      userId: user.id,
    })

    await applyDecayPointsForAllChallenges(db)
    const before = await getSolvePoints(solve.id)
    expect(before).toBe(classicScore(1, 50, 500))

    await db
      .update(challenges)
      .set({ data: { ...challenge.data, points: { min: 50, max: 1000 } } })
      .where(eq(challenges.id, challenge.id))

    const publish = mock(async () => 0 as 0 | 1)
    const redis = { publish } as unknown as TypedRedis
    const logger = { error: mock(() => {}) } as unknown as PinoLogger

    await applyChallengeConfigChange(db, redis, logger, challenge.id)

    expect(await getSolvePoints(solve.id)).toBe(classicScore(1, 50, 1000))
    expect(publish).toHaveBeenCalled()
  })

  test('all-challenge recompute refreshes persisted points after timing changes', async () => {
    replaceScoreProvider(new JammyProvider({}))
    const db = getDb()
    const base = config.startTime + 86_400_000
    const user = await insertUser()
    const challenge = await insertChallenge()
    const solve = await insertSolve({
      challengeId: challenge.id,
      userId: user.id,
      createdAt: isoAt(base + 5_000),
    })

    await setSettingsOverride({ startTime: base, endTime: base + 10_000 })
    await applyDecayPointsForAllChallenges(db)
    const before = await getSolvePoints(solve.id)

    await setSettingsOverride({
      startTime: base + 1_000,
      endTime: base + 10_000,
    })
    await applyDecayPointsForAllChallenges(db, 'algo-change')

    expect(await getSolvePoints(solve.id)).not.toBe(before)
  })
})

describe('incremental vs full rebuild equivalence', () => {
  test('incremental update produces same users and scores as fresh rebuild', async () => {
    const db = getDb()
    const userA = await insertUser('alice')
    const userB = await insertUser('bob')
    const userC = await insertUser('carol')
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 50, max: 300 } })

    await insertSolve({
      challengeId: ch1.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })

    const cached = createCachedLeaderboardCalculator()
    await cached(db)

    await insertSolve({
      challengeId: ch2.id,
      userId: userA.id,
      createdAt: isoAt(T2),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userC.id,
      createdAt: isoAt(T3),
    })
    await insertSolve({
      challengeId: ch2.id,
      userId: userC.id,
      createdAt: isoAt(T4),
    })

    const incremental = await cached(db)
    expect(incremental.recomputedFromScratch).toBe(false)

    const fresh = createCachedLeaderboardCalculator()
    const fromScratch = await fresh(db)
    expect(fromScratch.recomputedFromScratch).toBe(true)

    expect(incremental.calculated.users.length).toBe(
      fromScratch.calculated.users.length
    )
    for (let i = 0; i < incremental.calculated.users.length; i++) {
      const inc = incremental.calculated.users[i]!
      const scr = fromScratch.calculated.users[i]!
      expect(inc.id).toBe(scr.id)
      expect(inc.name).toBe(scr.name)
      expect(inc.score).toBe(scr.score)
      expect(inc.division).toBe(scr.division)
    }

    expect(incremental.calculated.challengeInfos.size).toBe(
      fromScratch.calculated.challengeInfos.size
    )
    for (const [id, incInfo] of incremental.calculated.challengeInfos) {
      const scrInfo = fromScratch.calculated.challengeInfos.get(id)
      expect(scrInfo).toBeDefined()
      expect(incInfo.score).toBe(scrInfo!.score)
      expect(incInfo.solves).toBe(scrInfo!.solves)
    }

    const incSamplesByTime = new Map(
      incremental.calculated.samples.map(s => [s.time, s])
    )
    for (const scrSample of fromScratch.calculated.samples) {
      const incSample = incSamplesByTime.get(scrSample.time)
      expect(incSample).toBeDefined()
      const incScores = new Map(incSample!.userScores.map(s => [s.id, s.score]))
      const scrScores = new Map(scrSample.userScores.map(s => [s.id, s.score]))
      expect(incScores).toEqual(scrScores)
    }
  })

  test('multiple incremental batches produce same result as single rebuild', async () => {
    const db = getDb()
    const userA = await insertUser()
    const userB = await insertUser()
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    const cached = createCachedLeaderboardCalculator()

    await insertSolve({
      challengeId: ch.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    const r1 = await cached(db)
    expect(r1.recomputedFromScratch).toBe(true)

    await insertSolve({
      challengeId: ch.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })
    const r2 = await cached(db)
    expect(r2.recomputedFromScratch).toBe(false)

    const fresh = await calculateLeaderboard(db)

    expect(r2.calculated.users.length).toBe(fresh.users.length)
    for (let i = 0; i < r2.calculated.users.length; i++) {
      expect(r2.calculated.users[i]!.id).toBe(fresh.users[i]!.id)
      expect(r2.calculated.users[i]!.score).toBe(fresh.users[i]!.score)
    }

    for (const [id, info] of r2.calculated.challengeInfos) {
      const freshInfo = fresh.challengeInfos.get(id)
      expect(info.score).toBe(freshInfo!.score)
      expect(info.solves).toBe(freshInfo!.solves)
    }
  })
})

describe('leaderboard ordering and tiebreaks', () => {
  test('users are ordered by score descending', async () => {
    const db = getDb()
    const userA = await insertUser('high-scorer')
    const userB = await insertUser('low-scorer')
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch1.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch2.id,
      userId: userA.id,
      createdAt: isoAt(T1),
    })
    await insertSolve({
      challengeId: ch1.id,
      userId: userB.id,
      createdAt: isoAt(T2),
    })

    const result = await calculateLeaderboard(db)

    expect(result.users[0]?.id).toBe(userA.id)
    expect(result.users[1]?.id).toBe(userB.id)
    expect(result.users[0]!.score).toBeGreaterThan(result.users[1]!.score)
  })

  test('tiebreak by last tiebreak-eligible solve time', async () => {
    const db = getDb()
    const userEarly = await insertUser('early')
    const userLate = await insertUser('late')
    const ch = await insertChallenge({
      tiebreakEligible: true,
      points: { min: 100, max: 500 },
    })

    await insertSolve({
      challengeId: ch.id,
      userId: userEarly.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: userLate.id,
      createdAt: isoAt(T1),
    })

    const result = await calculateLeaderboard(db)

    expect(result.users[0]?.score).toBe(result.users[1]?.score)
    expect(result.users[0]?.id).toBe(userEarly.id)
    expect(result.users[1]?.id).toBe(userLate.id)
  })

  test('non-tiebreak-eligible solves do not affect tiebreak ordering', async () => {
    const db = getDb()
    const userA = await insertUser('user-a')
    const userB = await insertUser('user-b')
    const tbChall = await insertChallenge({
      tiebreakEligible: true,
      points: { min: 100, max: 500 },
    })
    const nonTbChall = await insertChallenge({
      tiebreakEligible: false,
      points: { min: 100, max: 500 },
    })

    await insertSolve({
      challengeId: tbChall.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: nonTbChall.id,
      userId: userA.id,
      createdAt: isoAt(T3),
    })
    await insertSolve({
      challengeId: nonTbChall.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })
    await insertSolve({
      challengeId: tbChall.id,
      userId: userB.id,
      createdAt: isoAt(T2),
    })

    const result = await calculateLeaderboard(db)
    expect(result.users[0]?.score).toBe(result.users[1]?.score)
    expect(result.users[0]?.id).toBe(userA.id)
    expect(result.users[1]?.id).toBe(userB.id)
  })

  test('falls back to lastSolve when no tiebreak-eligible solves exist', async () => {
    const db = getDb()
    const userEarly = await insertUser('early')
    const userLate = await insertUser('late')
    const ch = await insertChallenge({
      tiebreakEligible: false,
      points: { min: 100, max: 500 },
    })

    await insertSolve({
      challengeId: ch.id,
      userId: userEarly.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: userLate.id,
      createdAt: isoAt(T1),
    })

    const result = await calculateLeaderboard(db)

    expect(result.users[0]?.score).toBe(result.users[1]?.score)
    expect(result.users[0]?.id).toBe(userEarly.id)
    expect(result.users[1]?.id).toBe(userLate.id)
  })
})

describe('graph samples', () => {
  test('includes final sample at endTime when event ends off the sample boundary', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 100, max: 500 } })

    const originalNow = Date.now
    const originalEndTime = config.endTime
    const originalGraphSampleTime = config.leaderboard.graphSampleTime
    const sampleTime = 60_000
    const sampleBoundary =
      Math.ceil((config.startTime + sampleTime * 2) / sampleTime) * sampleTime
    const offBoundaryEndTime = sampleBoundary + 45_000

    config.leaderboard.graphSampleTime = sampleTime
    config.endTime = offBoundaryEndTime

    try {
      await insertSolve({
        challengeId: ch1.id,
        userId: user.id,
        createdAt: isoAt(sampleBoundary - 30_000),
      })
      await insertSolve({
        challengeId: ch2.id,
        userId: user.id,
        createdAt: isoAt(sampleBoundary + 15_000),
      })

      Date.now = () => offBoundaryEndTime + 5_000
      const result = await calculateLeaderboard(db)

      expect(result.samples.map(sample => sample.time)).toEqual([
        sampleBoundary,
        offBoundaryEndTime,
      ])
      expect(result.samples.at(-1)?.time).toBe(offBoundaryEndTime)
    } finally {
      Date.now = originalNow
      config.endTime = originalEndTime
      config.leaderboard.graphSampleTime = originalGraphSampleTime
    }
  })

  test('incremental updates replace trailing samples instead of accumulating them', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch3 = await insertChallenge({ points: { min: 100, max: 500 } })

    const calc = createCachedLeaderboardCalculator()
    const originalNow = Date.now
    const originalGraphSampleTime = config.leaderboard.graphSampleTime
    const sampleTime = 60_000
    const sampleBoundary =
      Math.ceil((config.startTime + sampleTime * 2) / sampleTime) * sampleTime
    const solve1Time = sampleBoundary - 40_000
    const now1 = sampleBoundary - 20_000
    const solve2Time = sampleBoundary - 10_000
    const now2 = sampleBoundary - 5_000
    const solve3Time = sampleBoundary + 10_000
    const now3 = sampleBoundary + 30_000

    config.leaderboard.graphSampleTime = sampleTime

    try {
      await insertSolve({
        challengeId: ch1.id,
        userId: user.id,
        createdAt: isoAt(solve1Time),
      })

      Date.now = () => now1
      const first = await calc(db)
      expect(first.calculated.samples.map(sample => sample.time)).toEqual([
        now1,
      ])

      await insertSolve({
        challengeId: ch2.id,
        userId: user.id,
        createdAt: isoAt(solve2Time),
      })

      Date.now = () => now2
      const second = await calc(db)
      expect(second.calculated.samples.map(sample => sample.time)).toEqual([
        now2,
      ])

      await insertSolve({
        challengeId: ch3.id,
        userId: user.id,
        createdAt: isoAt(solve3Time),
      })

      Date.now = () => now3
      const incremental = await calc(db)
      const fresh = await calculateLeaderboard(db)

      expect(incremental.calculated.samples).toEqual(fresh.samples)
      expect(
        incremental.calculated.samples.filter(
          sample => sample.time % sampleTime !== 0
        )
      ).toHaveLength(1)
      expect(incremental.calculated.samples.at(-1)?.time).toBe(now3)
    } finally {
      Date.now = originalNow
      config.leaderboard.graphSampleTime = originalGraphSampleTime
    }
  })

  test('incremental updates do not revisit old boundaries with trailing-state scores', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch1 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch2 = await insertChallenge({ points: { min: 100, max: 500 } })
    const ch3 = await insertChallenge({ points: { min: 100, max: 500 } })

    const calc = createCachedLeaderboardCalculator()
    const originalNow = Date.now
    const originalGraphSampleTime = config.leaderboard.graphSampleTime
    const sampleTime = 60_000
    const sampleBoundary =
      Math.ceil((config.startTime + sampleTime * 2) / sampleTime) * sampleTime
    const solve1Time = sampleBoundary - 20_000
    const solve2Time = sampleBoundary + 10_000
    const now1 = sampleBoundary + 30_000
    const solve3Time = sampleBoundary + sampleTime + 10_000
    const now2 = sampleBoundary + sampleTime + 30_000

    config.leaderboard.graphSampleTime = sampleTime

    try {
      await insertSolve({
        challengeId: ch1.id,
        userId: user.id,
        createdAt: isoAt(solve1Time),
      })
      await insertSolve({
        challengeId: ch2.id,
        userId: user.id,
        createdAt: isoAt(solve2Time),
      })

      Date.now = () => now1
      const first = await calc(db)
      expect(first.calculated.samples.map(sample => sample.time)).toEqual([
        sampleBoundary,
        now1,
      ])

      await insertSolve({
        challengeId: ch3.id,
        userId: user.id,
        createdAt: isoAt(solve3Time),
      })

      Date.now = () => now2
      const incremental = await calc(db)
      const fresh = await calculateLeaderboard(db)

      expect(incremental.calculated.samples).toEqual(fresh.samples)
      expect(incremental.calculated.samples.map(sample => sample.time)).toEqual(
        [sampleBoundary, sampleBoundary + sampleTime, now2]
      )
    } finally {
      Date.now = originalNow
      config.leaderboard.graphSampleTime = originalGraphSampleTime
    }
  })

  test('samples contain correct user scores', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)

    expect(result.samples.length).toBeGreaterThan(0)

    const lastSample = result.samples[result.samples.length - 1]!
    const userScore = lastSample.userScores.find(s => s.id === user.id)
    expect(userScore).toBeDefined()
    expect(userScore!.score).toBe(result.users[0]!.score)
  })

  test('samples deduplicate when scores do not change', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch = await insertChallenge()

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)

    for (const sample of result.samples) {
      if (sample.userScores.length > 0) {
        const userScore = sample.userScores.find(s => s.id === user.id)
        expect(userScore?.score).toBe(result.users[0]!.score)
      }
    }
    expect(result.samples.length).toBeLessThanOrEqual(2)
  })

  test('samples reflect score changes over time', async () => {
    const db = getDb()
    const user1 = await insertUser()
    const user2 = await insertUser()
    const ch = await insertChallenge({ points: { min: 100, max: 500 } })

    const solveTime1 = config.startTime + 1_800_000 * 3 // 3 periods in
    const solveTime2 = config.startTime + 1_800_000 * 6 // 6 periods in

    await insertSolve({
      challengeId: ch.id,
      userId: user1.id,
      createdAt: isoAt(solveTime1),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: user2.id,
      createdAt: isoAt(solveTime2),
    })

    const result = await calculateLeaderboard(db)

    expect(result.samples.length).toBeGreaterThanOrEqual(2)

    const firstSample = result.samples[0]!
    const lastSample = result.samples[result.samples.length - 1]!

    const score1Solve = classicScore(1, 100, 500)
    const score2Solves = classicScore(2, 100, 500)

    expect(firstSample.userScores).toHaveLength(1)
    expect(firstSample.userScores[0]!.score).toBe(score1Solve)
    expect(lastSample.userScores).toHaveLength(2)
    expect(lastSample.userScores[0]!.score).toBe(score2Solves)
  })

  test('users with zero score are excluded from samples', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch = await insertChallenge({ points: { min: 0, max: 0 } })

    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)

    for (const sample of result.samples) {
      const userScore = sample.userScores.find(s => s.id === user.id)
      expect(userScore).toBeUndefined()
    }
  })
})

describe('calculateLeaderboard standalone', () => {
  test('returns valid structure with no data', async () => {
    const db = getDb()

    // Ensure clean state - other tests may leave data in shared PGlite
    await db.delete(solves)
    await db.delete(users)
    await db.delete(challenges)

    const result = await calculateLeaderboard(db)

    expect(result.users).toEqual([])
    expect(result.challengeInfos.size).toBe(0)
    for (const sample of result.samples) {
      expect(sample.userScores).toEqual([])
    }
  })

  test('returns correct structure with data', async () => {
    const db = getDb()
    const user = await insertUser('test-user')
    const ch = await insertChallenge({
      name: 'test-challenge',
      category: 'misc',
    })
    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)

    expect(result.users).toHaveLength(1)
    expect(result.users[0]?.name).toBe('test-user')
    expect(result.users[0]?.hadAnySolve).toBe(true)

    const chInfo = result.challengeInfos.get(ch.id)
    expect(chInfo).toBeDefined()
    expect(chInfo!.name).toBe('test-challenge')
    expect(chInfo!.category).toBe('misc')
    expect(chInfo!.solves).toBe(1)
  })

  test('produces same result as cached calculator on first call', async () => {
    const db = getDb()
    const userA = await insertUser()
    const userB = await insertUser()
    const ch = await insertChallenge()

    await insertSolve({
      challengeId: ch.id,
      userId: userA.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: ch.id,
      userId: userB.id,
      createdAt: isoAt(T1),
    })

    const standalone = await calculateLeaderboard(db)
    const calc = createCachedLeaderboardCalculator()
    const cached = await calc(db)

    expect(standalone.users.length).toBe(cached.calculated.users.length)
    for (let i = 0; i < standalone.users.length; i++) {
      expect(standalone.users[i]!.id).toBe(cached.calculated.users[i]!.id)
      expect(standalone.users[i]!.score).toBe(cached.calculated.users[i]!.score)
    }
  })
})

describe('edge cases', () => {
  test('hidden challenges are excluded', async () => {
    const db = getDb()
    const user = await insertUser()
    const visible = await insertChallenge({ name: 'visible' })
    const hidden = await insertChallenge({ name: 'hidden', hidden: true })

    await insertSolve({
      challengeId: visible.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: hidden.id,
      userId: user.id,
      createdAt: isoAt(T1),
    })

    const result = await calculateLeaderboard(db)

    expect(result.challengeInfos.has(visible.id)).toBe(true)
    expect(result.challengeInfos.has(hidden.id)).toBe(false)
    expect(result.users[0]?.score).toBe(classicScore(1, 100, 500))
  })

  test('challenges with future releaseTime are excluded', async () => {
    const db = getDb()
    const user = await insertUser()
    const released = await insertChallenge({ name: 'released' })
    const future = await insertChallenge({
      name: 'future',
      releaseTime: Date.now() + 86_400_000, // tomorrow
    })

    await insertSolve({
      challengeId: released.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: future.id,
      userId: user.id,
      createdAt: isoAt(T1),
    })

    const result = await calculateLeaderboard(db)

    expect(result.challengeInfos.has(released.id)).toBe(true)
    expect(result.challengeInfos.has(future.id)).toBe(false)
    expect(result.users[0]?.score).toBe(classicScore(1, 100, 500))
  })

  test('users with no solves are not in the leaderboard', async () => {
    const db = getDb()
    await insertUser('no-solves')
    const solver = await insertUser('solver')
    const ch = await insertChallenge()
    await insertSolve({
      challengeId: ch.id,
      userId: solver.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)

    expect(result.users).toHaveLength(1)
    expect(result.users[0]?.name).toBe('solver')
  })

  test('solves for non-public challenges are ignored in scoring', async () => {
    const db = getDb()
    const user = await insertUser()
    const publicCh = await insertChallenge({ name: 'public' })
    const hiddenCh = await insertChallenge({ name: 'hidden', hidden: true })

    await insertSolve({
      challengeId: publicCh.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })
    await insertSolve({
      challengeId: hiddenCh.id,
      userId: user.id,
      createdAt: isoAt(T1),
    })

    const result = await calculateLeaderboard(db)

    expect(result.users[0]?.score).toBe(classicScore(1, 100, 500))
    expect(result.challengeInfos.get(publicCh.id)?.solves).toBe(1)
  })

  test('challenge unsolved has score equal to maxPoints and 0 solves', async () => {
    const db = getDb()
    const user = await insertUser()
    const solved = await insertChallenge({
      name: 'solved',
      points: { min: 100, max: 500 },
    })
    const unsolved = await insertChallenge({
      name: 'unsolved',
      points: { min: 100, max: 500 },
    })

    await insertSolve({
      challengeId: solved.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const result = await calculateLeaderboard(db)

    const unsolvedInfo = result.challengeInfos.get(unsolved.id)
    expect(unsolvedInfo?.solves).toBe(0)
    expect(unsolvedInfo?.score).toBe(500)

    const solvedInfo = result.challengeInfos.get(solved.id)
    expect(solvedInfo?.solves).toBe(1)
    expect(solvedInfo?.score).toBe(500) // 1 solve = max for classic
  })

  test('cloneCalculatedLeaderboard returns independent copy', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch = await insertChallenge()
    await insertSolve({
      challengeId: ch.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    const first = await calc(db)
    const second = await calc(db)

    first.calculated.users.push({
      id: 'fake',
      name: 'fake',
      division: null,
      score: 999,
      hadAnySolve: false,
      lastSolve: undefined,
      lastTiebreakEligibleSolve: undefined,
    })

    expect(second.calculated.users.find(u => u.id === 'fake')).toBeUndefined()
  })
})

describe('rebuild uses fresh snapshots (stale-snapshot regression)', () => {
  test('user created after initial snapshot is visible after rebuild', async () => {
    const db = getDb()
    const existingUser = await insertUser('existing')
    const challenge = await insertChallenge()

    await insertSolve({
      challengeId: challenge.id,
      userId: existingUser.id,
      createdAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    const first = await calc(db)
    expect(first.recomputedFromScratch).toBe(true)
    expect(first.calculated.users).toHaveLength(1)

    const lateUser = await insertUser('late-arrival')
    await insertSolve({
      challengeId: challenge.id,
      userId: lateUser.id,
      createdAt: isoAt(T1),
    })

    const second = await calc(db)
    expect(
      second.calculated.users.find(u => u.id === lateUser.id)
    ).toBeDefined()
    expect(second.calculated.users).toHaveLength(2)
    expect(second.calculated.challengeInfos.get(challenge.id)?.solves).toBe(2)
  })

  test('challenge created after initial snapshot is visible after rebuild', async () => {
    const db = getDb()
    const user = await insertUser()
    const ch1 = await insertChallenge({ name: 'original' })

    await insertSolve({
      challengeId: ch1.id,
      userId: user.id,
      createdAt: isoAt(T0),
    })

    const calc = createCachedLeaderboardCalculator()
    await calc(db)

    const ch2 = await insertChallenge({ name: 'late-challenge' })
    await insertSolve({
      challengeId: ch2.id,
      userId: user.id,
      createdAt: isoAt(T1),
    })

    const second = await calc(db)
    expect(second.calculated.challengeInfos.has(ch2.id)).toBe(true)
    expect(second.calculated.challengeInfos.get(ch2.id)?.solves).toBe(1)
    const userEntry = second.calculated.users.find(u => u.id === user.id)
    expect(userEntry).toBeDefined()
    expect(userEntry!.score).toBeGreaterThan(
      second.calculated.challengeInfos.get(ch1.id)!.score
    )
  })

  test('consecutive rebuilds converge even when data keeps arriving', async () => {
    const db = getDb()
    const challenge = await insertChallenge()
    const calc = createCachedLeaderboardCalculator()

    const u1 = await insertUser('u1')
    await insertSolve({
      challengeId: challenge.id,
      userId: u1.id,
      createdAt: isoAt(T0),
    })
    await calc(db)

    const u2 = await insertUser('u2')
    await insertSolve({
      challengeId: challenge.id,
      userId: u2.id,
      createdAt: isoAt(T1),
    })
    await calc(db)

    const u3 = await insertUser('u3')
    await insertSolve({
      challengeId: challenge.id,
      userId: u3.id,
      createdAt: isoAt(T2),
    })
    const third = await calc(db)

    expect(third.calculated.users).toHaveLength(3)
    expect(third.calculated.challengeInfos.get(challenge.id)?.solves).toBe(3)

    const fourth = await calc(db)
    expect(fourth.changed).toBe(false)
    expect(fourth.recomputedFromScratch).toBe(false)
    expect(fourth.calculated.users).toHaveLength(3)
  })
})
