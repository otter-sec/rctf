import { config } from '@rctf/config'
import {
  challenges,
  ChallengeScoringKind,
  createDatabase,
  DynamicScoringTransport,
  scoreEvents,
  solves,
  users,
  type ChallengeData,
} from '@rctf/db'
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import RedisMock from 'ioredis-mock'
import {
  deleteSolve,
  getChallenges,
  getChallengeScoresGraph,
  getChallengeScoresWithPosition,
  getMaxSolveCount,
  upsertChallenge,
} from '../../../../apps/api/src/services/challenges'
import {
  applyDecayPointsForChallenge,
  upsertDynamicSolves,
} from '../../../../apps/api/src/services/solve-points'
import {
  deleteAdminUser,
  updateAdminUser,
} from '../../../../apps/api/src/services/users'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL } from '../../../../apps/api/src/workers'
import { getApp } from '../../app'
import { clearDatabase, generateRealTestUser } from '../../util'

const getDb = () => createDatabase(config.database.sql).db

const dynamicData = (
  overrides: Partial<ChallengeData> = {},
  secret = 'shared-secret'
): ChallengeData => ({
  name: 'dyn-' + crypto.randomUUID(),
  description: '',
  category: 'dynamic',
  author: 'test',
  files: [],
  flag: '',
  tiebreakEligible: true,
  points: { min: 0, max: 0 },
  scoring: {
    kind: ChallengeScoringKind.DYNAMIC,
    source: {
      transport: DynamicScoringTransport.WEBHOOK,
      secret,
    },
  },
  ...overrides,
})

const createDynamicChallenge = async (
  overrides: Partial<ChallengeData> = {},
  secret = 'shared-secret'
): Promise<string> => {
  const db = getDb()
  const id = crypto.randomUUID()
  await db
    .insert(challenges)
    .values({ id, data: dynamicData(overrides, secret) })
  return id
}

const createDecayChallenge = async (
  data: Partial<ChallengeData> = {}
): Promise<string> => {
  const db = getDb()
  const id = crypto.randomUUID()
  await db.insert(challenges).values({
    id,
    data: {
      name: 'decay-' + crypto.randomUUID(),
      description: '',
      category: 'decay',
      author: 'test',
      files: [],
      flag: 'flag{' + crypto.randomUUID() + '}',
      tiebreakEligible: true,
      points: { min: 100, max: 500 },
      scoring: { kind: ChallengeScoringKind.DECAY },
      ...data,
    },
  })
  return id
}

const sumScoreEvents = async (
  userId: string,
  challengeId: string
): Promise<number> => {
  const db = getDb()
  const events = await db
    .select({ delta: scoreEvents.pointsDelta })
    .from(scoreEvents)
    .where(
      and(
        eq(scoreEvents.userid, userId),
        eq(scoreEvents.challengeid, challengeId)
      )
    )
  return events.reduce((acc, e) => acc + e.delta, 0)
}

const countScoreEvents = async (
  userId: string,
  challengeId: string
): Promise<number> => {
  const db = getDb()
  const rows = await db
    .select({ id: scoreEvents.id })
    .from(scoreEvents)
    .where(
      and(
        eq(scoreEvents.userid, userId),
        eq(scoreEvents.challengeid, challengeId)
      )
    )
  return rows.length
}

const getSolvePoints = async (
  userId: string,
  challengeId: string
): Promise<number | null> => {
  const db = getDb()
  const row = await db
    .select({ points: solves.points })
    .from(solves)
    .where(and(eq(solves.userid, userId), eq(solves.challengeid, challengeId)))
    .limit(1)
  return row[0]?.points ?? null
}

beforeAll(async () => {
  await getApp()
})

beforeEach(async () => {
  await clearDatabase()
  const redis = await createRedis()
  await redis.flushdb()
})

describe('upsertDynamicSolves: banned-user filtering', () => {
  test('silently drops feed entries for banned users with no prior solve', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    await db.update(users).set({ banned: true }).where(eq(users.id, user.id))
    const challengeId = await createDynamicChallenge()

    const result = await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 500 },
    ])

    expect(result).toEqual({ inserted: 0, updated: 0, deleted: 0 })
    expect(await getSolvePoints(user.id, challengeId)).toBeNull()
    expect(await countScoreEvents(user.id, challengeId)).toBe(0)
  })

  test('silently drops feed entries for banned users with a prior solve', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 300 },
    ])
    expect(await getSolvePoints(user.id, challengeId)).toBe(300)

    await db.update(users).set({ banned: true }).where(eq(users.id, user.id))
    const beforeEvents = await countScoreEvents(user.id, challengeId)

    const result = await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 500 },
    ])

    expect(result).toEqual({ inserted: 0, updated: 0, deleted: 0 })
    expect(await getSolvePoints(user.id, challengeId)).toBe(300)
    expect(await countScoreEvents(user.id, challengeId)).toBe(beforeEvents)
  })

  test('zero-point feed for a banned user does not delete the existing solve', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 300 },
    ])
    await db.update(users).set({ banned: true }).where(eq(users.id, user.id))

    const result = await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 0 },
    ])

    expect(result).toEqual({ inserted: 0, updated: 0, deleted: 0 })
    expect(await getSolvePoints(user.id, challengeId)).toBe(300)
  })

  test('mixed batch: active applies, banned and unknown silently drop', async () => {
    const db = getDb()
    const { user: alice } = await generateRealTestUser()
    const { user: bannedBob } = await generateRealTestUser()
    await db
      .update(users)
      .set({ banned: true })
      .where(eq(users.id, bannedBob.id))
    const challengeId = await createDynamicChallenge()
    const ghost = '00000000-0000-0000-0000-000000000000'

    const result = await upsertDynamicSolves(db, challengeId, [
      { userId: alice.id, points: 100 },
      { userId: bannedBob.id, points: 200 },
      { userId: ghost, points: 999 },
    ])

    expect(result.inserted).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.deleted).toBe(0)
    expect(await getSolvePoints(alice.id, challengeId)).toBe(100)
    expect(await getSolvePoints(bannedBob.id, challengeId)).toBeNull()
    expect(await getSolvePoints(ghost, challengeId)).toBeNull()
    expect(await countScoreEvents(alice.id, challengeId)).toBe(1)
    expect(await countScoreEvents(bannedBob.id, challengeId)).toBe(0)
  })
})

describe('getChallenges dynamic participant display', () => {
  test('returns current score and latest point delta for a dynamic challenge', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 300 },
    ])

    let challenge = (await getChallenges(db, user.id)).find(
      item => item.id === challengeId
    )
    expect(challenge?.myScore).toBe(300)
    expect(challenge?.myPointDelta).toBe(300)

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 125 },
    ])

    challenge = (await getChallenges(db, user.id)).find(
      item => item.id === challengeId
    )
    expect(challenge?.myScore).toBe(125)
    expect(challenge?.myPointDelta).toBe(-175)

    // zeroing removes the solve, so the team is off the board entirely
    await upsertDynamicSolves(db, challengeId, [{ userId: user.id, points: 0 }])

    challenge = (await getChallenges(db, user.id)).find(
      item => item.id === challengeId
    )
    expect(challenge?.myScore).toBeUndefined()
    expect(challenge?.myPointDelta).toBeUndefined()
  })
})

describe('getChallengeScoresWithPosition', () => {
  test('ranks teams by points desc with latest delta, total, and myPosition', async () => {
    const db = getDb()
    const { user: alice } = await generateRealTestUser()
    const { user: bob } = await generateRealTestUser()
    const { user: carol } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: alice.id, points: 100 },
      { userId: bob.id, points: 500 },
      { userId: carol.id, points: 300 },
    ])

    const result = await getChallengeScoresWithPosition(
      db,
      challengeId,
      carol.id,
      100,
      0
    )

    expect(result.challengeExists).toBe(true)
    expect(result.total).toBe(3)
    expect(result.scores.map(s => s.userId)).toEqual([
      bob.id,
      carol.id,
      alice.id,
    ])
    expect(result.scores.map(s => s.points)).toEqual([500, 300, 100])
    expect(result.scores.map(s => s.pointDelta)).toEqual([500, 300, 100])
    expect(result.myPosition).toBe(2)
  })

  test('pointDelta reflects only the latest feed tick', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 300 },
    ])
    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 125 },
    ])

    const result = await getChallengeScoresWithPosition(
      db,
      challengeId,
      user.id,
      100,
      0
    )
    expect(result.scores[0]?.points).toBe(125)
    expect(result.scores[0]?.pointDelta).toBe(-175)
    expect(result.myPosition).toBe(1)
  })

  test('pointDelta is 0 for a team that did not move in the latest tick', async () => {
    const db = getDb()
    const { user: mover } = await generateRealTestUser()
    const { user: idle } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    // first tick: both teams score
    await upsertDynamicSolves(db, challengeId, [
      { userId: mover.id, points: 100 },
      { userId: idle.id, points: 300 },
    ])
    // later tick: only mover updates, so idle didn't move in the latest tick
    await upsertDynamicSolves(db, challengeId, [
      { userId: mover.id, points: 250 },
    ])

    const result = await getChallengeScoresWithPosition(
      db,
      challengeId,
      idle.id,
      100,
      0
    )
    const moverRow = result.scores.find(s => s.userId === mover.id)
    const idleRow = result.scores.find(s => s.userId === idle.id)
    expect(moverRow?.pointDelta).toBe(150)
    expect(idleRow?.pointDelta).toBe(0)
  })

  test('excludes banned and zeroed teams from the ranking and total', async () => {
    const db = getDb()
    const { user: active } = await generateRealTestUser()
    const { user: banned } = await generateRealTestUser()
    const { user: zeroed } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: active.id, points: 400 },
      { userId: banned.id, points: 600 },
      { userId: zeroed.id, points: 200 },
    ])
    await upsertDynamicSolves(db, challengeId, [
      { userId: zeroed.id, points: 0 },
    ])
    await db.update(users).set({ banned: true }).where(eq(users.id, banned.id))

    const result = await getChallengeScoresWithPosition(
      db,
      challengeId,
      null,
      100,
      0
    )
    expect(result.total).toBe(1)
    expect(result.scores.map(s => s.userId)).toEqual([active.id])
    expect(result.myPosition).toBeNull()
  })

  test('paginates with a stable total', async () => {
    const db = getDb()
    const challengeId = await createDynamicChallenge()
    const entries: { userId: string; points: number }[] = []
    for (let i = 0; i < 5; i++) {
      const { user } = await generateRealTestUser()
      entries.push({ userId: user.id, points: (i + 1) * 100 })
    }
    await upsertDynamicSolves(db, challengeId, entries)

    const page1 = await getChallengeScoresWithPosition(
      db,
      challengeId,
      null,
      2,
      0
    )
    expect(page1.total).toBe(5)
    expect(page1.scores.map(s => s.points)).toEqual([500, 400])

    const page2 = await getChallengeScoresWithPosition(
      db,
      challengeId,
      null,
      2,
      2
    )
    expect(page2.total).toBe(5)
    expect(page2.scores.map(s => s.points)).toEqual([300, 200])
  })

  test('returns challengeExists false for an unknown challenge', async () => {
    const db = getDb()
    const result = await getChallengeScoresWithPosition(
      db,
      crypto.randomUUID(),
      null,
      100,
      0
    )
    expect(result.challengeExists).toBe(false)
    expect(result.scores).toEqual([])
    expect(result.total).toBe(0)
    expect(result.myPosition).toBeNull()
  })
})

describe('getChallengeScoresGraph', () => {
  test('builds a cumulative series with a trailing sample', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 100 },
    ])
    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 250 },
    ])
    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 175 },
    ])

    const graph = await getChallengeScoresGraph(db, challengeId, [user.id])
    expect(graph).toHaveLength(1)
    expect(graph[0]?.id).toBe(user.id)

    const scores = graph[0]!.points.map(p => p.score)
    expect(scores.slice(0, 3)).toEqual([100, 250, 175])
    expect(scores.at(-1)).toBe(175)
    expect(scores.length).toBeGreaterThanOrEqual(3)
    expect(scores.length).toBeLessThanOrEqual(4)

    const times = graph[0]!.points.map(p => p.time)
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  test('excludes banned teams even when requested', async () => {
    const db = getDb()
    const { user: active } = await generateRealTestUser()
    const { user: banned } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: active.id, points: 300 },
      { userId: banned.id, points: 400 },
    ])
    await db.update(users).set({ banned: true }).where(eq(users.id, banned.id))

    const graph = await getChallengeScoresGraph(db, challengeId, [
      active.id,
      banned.id,
    ])
    expect(graph.map(g => g.id)).toEqual([active.id])
  })

  test('returns an empty array when no users are requested', async () => {
    const db = getDb()
    const challengeId = await createDynamicChallenge()
    expect(await getChallengeScoresGraph(db, challengeId, [])).toEqual([])
  })

  test('does not double-count after admin solve deletion + re-score', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 300 },
    ])
    await deleteSolve(db, { userId: user.id, challengeId })
    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 500 },
    ])

    const graph = await getChallengeScoresGraph(db, challengeId, [user.id])
    expect(graph).toHaveLength(1)
    const scores = graph[0]!.points.map(p => p.score)
    // 300 (feed), 0 (delete correction), 500 (re-feed), trailing 500 sample.
    expect(scores.slice(0, 3)).toEqual([300, 0, 500])
    expect(scores.at(-1)).toBe(500)
  })

  test('keeps late feed deliveries past the competition end at their true times', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()
    const originalEndTime = config.endTime

    config.endTime = Date.now() - 60_000
    try {
      await upsertDynamicSolves(db, challengeId, [
        { userId: user.id, points: 100 },
      ])
      await upsertDynamicSolves(db, challengeId, [
        { userId: user.id, points: 250 },
      ])

      const graph = await getChallengeScoresGraph(db, challengeId, [user.id])
      expect(graph).toHaveLength(1)
      const points = graph[0]!.points
      expect(points).toHaveLength(2)
      expect(points.every(p => p.time > config.endTime)).toBe(true)
      expect(points.at(-1)?.time).toBeLessThanOrEqual(Date.now())
      expect(points.map(p => p.score)).toEqual([100, 250])
    } finally {
      config.endTime = originalEndTime
    }
  })

  test('does not append a trailing "now" sample past the competition end', async () => {
    const db = getDb()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()
    const originalEndTime = config.endTime
    const endTime = Date.now() - 60_000

    await db.insert(scoreEvents).values([
      {
        id: crypto.randomUUID(),
        challengeid: challengeId,
        userid: user.id,
        pointsDelta: 100,
        source: 'feed',
        eventAt: new Date(endTime - 10_000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: challengeId,
        userid: user.id,
        pointsDelta: -100,
        source: 'delete',
        eventAt: new Date(endTime + 30_000).toISOString(),
      },
    ])

    config.endTime = endTime
    try {
      const graph = await getChallengeScoresGraph(db, challengeId, [user.id])
      expect(graph).toHaveLength(1)
      expect(graph[0]!.points).toEqual([
        { time: endTime - 10_000, score: 100 },
        { time: endTime + 30_000, score: 0 },
      ])
    } finally {
      config.endTime = originalEndTime
    }
  })
})

describe('feed-during-ban invariant', () => {
  test('events sum equals solves.points after ban -> feed -> unban', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 300 },
    ])
    expect(await getSolvePoints(user.id, challengeId)).toBe(300)
    expect(await sumScoreEvents(user.id, challengeId)).toBe(300)

    const banResult = await updateAdminUser(db, redis, user.id, {
      banned: true,
    })
    expect(banResult.success).toBe(true)
    expect(await sumScoreEvents(user.id, challengeId)).toBe(0)

    // feed update during ban window - has to be dropped to keep the invariant
    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 500 },
    ])
    expect(await getSolvePoints(user.id, challengeId)).toBe(300)
    expect(await sumScoreEvents(user.id, challengeId)).toBe(0)

    const unbanResult = await updateAdminUser(db, redis, user.id, {
      banned: false,
    })
    expect(unbanResult.success).toBe(true)

    expect(await getSolvePoints(user.id, challengeId)).toBe(300)
    expect(await sumScoreEvents(user.id, challengeId)).toBe(300)
  })

  test('events sum equals solves.points across ban -> unban for multiple challenges', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const c1 = await createDynamicChallenge()
    const c2 = await createDynamicChallenge()

    await upsertDynamicSolves(db, c1, [{ userId: user.id, points: 100 }])
    await upsertDynamicSolves(db, c2, [{ userId: user.id, points: 250 }])

    await updateAdminUser(db, redis, user.id, { banned: true })
    // attempted feed during ban
    await upsertDynamicSolves(db, c1, [{ userId: user.id, points: 999 }])
    await upsertDynamicSolves(db, c2, [{ userId: user.id, points: 0 }])
    await updateAdminUser(db, redis, user.id, { banned: false })

    expect(await getSolvePoints(user.id, c1)).toBe(100)
    expect(await getSolvePoints(user.id, c2)).toBe(250)
    expect(await sumScoreEvents(user.id, c1)).toBe(100)
    expect(await sumScoreEvents(user.id, c2)).toBe(250)
  })

  test('decay recompute skips banned solves so unban restores original points', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const challengeId = await createDecayChallenge({
      points: { min: 100, max: 500 },
    })

    await db.insert(solves).values({
      id: crypto.randomUUID(),
      challengeid: challengeId,
      userid: user.id,
      createdat: new Date(config.startTime + 1000).toISOString(),
      points: 0,
    })

    await applyDecayPointsForChallenge(db, challengeId, 'flag')
    const originalPoints = await getSolvePoints(user.id, challengeId)
    expect(originalPoints).toBe(500)
    expect(await sumScoreEvents(user.id, challengeId)).toBe(originalPoints)

    await updateAdminUser(db, redis, user.id, { banned: true })
    expect(await sumScoreEvents(user.id, challengeId)).toBe(0)

    const [challenge] = await db
      .select({ data: challenges.data })
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1)
    await db
      .update(challenges)
      .set({
        data: {
          ...challenge!.data,
          points: { min: 100, max: 1000 },
        },
      })
      .where(eq(challenges.id, challengeId))

    const bannedRecompute = await applyDecayPointsForChallenge(
      db,
      challengeId,
      'algo-change'
    )
    expect(bannedRecompute.updatedCount).toBe(0)
    expect(await getSolvePoints(user.id, challengeId)).toBe(originalPoints)
    expect(await sumScoreEvents(user.id, challengeId)).toBe(0)

    await updateAdminUser(db, redis, user.id, { banned: false })
    expect(await getSolvePoints(user.id, challengeId)).toBe(originalPoints)
    expect(await sumScoreEvents(user.id, challengeId)).toBe(originalPoints)

    await applyDecayPointsForChallenge(db, challengeId, 'algo-change')
    const updatedPoints = await getSolvePoints(user.id, challengeId)
    expect(updatedPoints).not.toBe(originalPoints)
    expect(await sumScoreEvents(user.id, challengeId)).toBe(updatedPoints)
  })
})

describe('recompute pub/sub filtering', () => {
  const collectRecomputeMessages = async (): Promise<{
    messages: Array<{ scope: string; challengeId?: string; source?: string }>
    waitFor: (count: number, timeoutMs?: number) => Promise<void>
  }> => {
    const subscriber = new RedisMock()
    const messages: Array<{
      scope: string
      challengeId?: string
      source?: string
    }> = []
    subscriber.on('message', (_ch: string, msg: string) => {
      messages.push(JSON.parse(msg))
    })
    await subscriber.subscribe(LEADERBOARD_RECOMPUTE_CHALLENGE_CHANNEL)

    const waitFor = async (count: number, timeoutMs = 500): Promise<void> => {
      const start = Date.now()
      while (messages.length < count && Date.now() - start < timeoutMs) {
        await new Promise(r => setTimeout(r, 20))
      }
    }

    return { messages, waitFor }
  }

  test('ban only enqueues recomputes for decay challenges the user solved', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const decayId = await createDecayChallenge()
    const dynamicId = await createDynamicChallenge()

    // decay solve
    await db.insert(solves).values({
      id: crypto.randomUUID(),
      challengeid: decayId,
      userid: user.id,
      createdat: new Date(config.startTime + 1000).toISOString(),
      points: 500,
    })
    // dynamic solve via feed
    await upsertDynamicSolves(db, dynamicId, [{ userId: user.id, points: 300 }])

    const { messages, waitFor } = await collectRecomputeMessages()

    const result = await updateAdminUser(db, redis, user.id, { banned: true })
    expect(result.success).toBe(true)

    await waitFor(1)

    const challengeMessages = messages.filter(m => m.scope === 'challenge')
    expect(challengeMessages.map(m => m.challengeId)).toEqual([decayId])
    expect(challengeMessages[0]?.source).toBe('ban')
  })

  test('delete only enqueues recomputes for decay challenges the user solved', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const decayId = await createDecayChallenge()
    const dynamicId = await createDynamicChallenge()

    await db.insert(solves).values({
      id: crypto.randomUUID(),
      challengeid: decayId,
      userid: user.id,
      createdat: new Date(config.startTime + 1000).toISOString(),
      points: 500,
    })
    await upsertDynamicSolves(db, dynamicId, [{ userId: user.id, points: 300 }])

    const { messages, waitFor } = await collectRecomputeMessages()

    const result = await deleteAdminUser(db, redis, user.id)
    expect(result.success).toBe(true)

    await waitFor(1)

    const challengeMessages = messages.filter(m => m.scope === 'challenge')
    expect(challengeMessages.map(m => m.challengeId)).toEqual([decayId])
    expect(challengeMessages[0]?.source).toBe('delete')
  })

  test('ban with only dynamic solves enqueues no per-challenge recomputes', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const dynamicId = await createDynamicChallenge()
    await upsertDynamicSolves(db, dynamicId, [{ userId: user.id, points: 300 }])

    const { messages, waitFor } = await collectRecomputeMessages()
    await updateAdminUser(db, redis, user.id, { banned: true })
    await waitFor(1, 200)

    expect(messages.filter(m => m.scope === 'challenge')).toEqual([])
  })
})

describe('admin transaction atomicity', () => {
  test('ban emits exactly one score_event per solved challenge', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const c1 = await createDynamicChallenge()
    const c2 = await createDynamicChallenge()
    await upsertDynamicSolves(db, c1, [{ userId: user.id, points: 100 }])
    await upsertDynamicSolves(db, c2, [{ userId: user.id, points: 200 }])

    await updateAdminUser(db, redis, user.id, { banned: true })

    const banEvents = await db
      .select({
        challengeid: scoreEvents.challengeid,
        delta: scoreEvents.pointsDelta,
      })
      .from(scoreEvents)
      .where(
        and(eq(scoreEvents.userid, user.id), eq(scoreEvents.source, 'ban'))
      )

    expect(banEvents).toHaveLength(2)
    const byChallenge = new Map(banEvents.map(e => [e.challengeid, e.delta]))
    expect(byChallenge.get(c1)).toBe(-100)
    expect(byChallenge.get(c2)).toBe(-200)

    const [updated] = await db.select().from(users).where(eq(users.id, user.id))
    expect(updated?.banned).toBe(true)
  })

  test('ban that does not change the banned flag emits no score_events', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()
    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 100 },
    ])

    await updateAdminUser(db, redis, user.id, { banned: false })

    const banEvents = await db
      .select({ id: scoreEvents.id })
      .from(scoreEvents)
      .where(
        and(eq(scoreEvents.userid, user.id), eq(scoreEvents.source, 'ban'))
      )
    expect(banEvents).toHaveLength(0)
  })

  test('deleting a banned user solve does not double-reverse score_events', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 100 },
    ])
    expect(await sumScoreEvents(user.id, challengeId)).toBe(100)

    await updateAdminUser(db, redis, user.id, { banned: true })
    expect(await sumScoreEvents(user.id, challengeId)).toBe(0)

    const removed = await deleteSolve(db, {
      challengeId,
      userId: user.id,
    })

    expect(removed).toHaveLength(1)
    expect(await getSolvePoints(user.id, challengeId)).toBeNull()
    expect(await sumScoreEvents(user.id, challengeId)).toBe(0)

    const deleteEvents = await db
      .select({ id: scoreEvents.id })
      .from(scoreEvents)
      .where(
        and(
          eq(scoreEvents.userid, user.id),
          eq(scoreEvents.challengeid, challengeId),
          eq(scoreEvents.source, 'delete')
        )
      )
    expect(deleteEvents).toHaveLength(0)

    await updateAdminUser(db, redis, user.id, { banned: false })
    expect(await sumScoreEvents(user.id, challengeId)).toBe(0)
  })

  test('deleting a banned user does not double-reverse score_events', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const challengeId = await createDynamicChallenge()

    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 100 },
    ])
    await updateAdminUser(db, redis, user.id, { banned: true })
    expect(await sumScoreEvents(user.id, challengeId)).toBe(0)

    const result = await deleteAdminUser(db, redis, user.id)
    expect(result.success).toBe(true)

    const rows = await db
      .select({ delta: scoreEvents.pointsDelta, source: scoreEvents.source })
      .from(scoreEvents)
      .where(eq(scoreEvents.challengeid, challengeId))
    expect(rows.filter(r => r.source === 'delete')).toHaveLength(0)
    expect(rows.reduce((acc, r) => acc + r.delta, 0)).toBe(0)
  })

  test('delete emits negative events for every solve and removes the user', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()
    const c1 = await createDynamicChallenge()
    const c2 = await createDynamicChallenge()
    await upsertDynamicSolves(db, c1, [{ userId: user.id, points: 100 }])
    await upsertDynamicSolves(db, c2, [{ userId: user.id, points: 200 }])

    await deleteAdminUser(db, redis, user.id)

    // score_events.userid is ON DELETE SET NULL - rows survive as tombstones
    const tombstones = await db
      .select({ challengeid: scoreEvents.challengeid })
      .from(scoreEvents)
      .where(eq(scoreEvents.source, 'delete'))
    expect(tombstones.map(t => t.challengeid).sort()).toEqual([c1, c2].sort())

    const userRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, user.id))
    expect(userRow).toHaveLength(0)
  })

  test('delete of a user without solves still succeeds and emits no events', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user } = await generateRealTestUser()

    const result = await deleteAdminUser(db, redis, user.id)
    expect(result.success).toBe(true)

    const events = await db
      .select({ id: scoreEvents.id })
      .from(scoreEvents)
      .where(eq(scoreEvents.source, 'delete'))
    expect(events).toHaveLength(0)
  })
})

describe('getMaxSolveCount scoping to decay', () => {
  test('dynamic challenges do not contribute to maxSolves', async () => {
    const db = getDb()
    const decay1 = await createDecayChallenge()
    const decay2 = await createDecayChallenge()
    const dynamic = await createDynamicChallenge()

    const usersList = await Promise.all([
      generateRealTestUser(),
      generateRealTestUser(),
      generateRealTestUser(),
      generateRealTestUser(),
      generateRealTestUser(),
    ])

    // decay1: 2 solvers, decay2: 1 solver
    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: decay1,
        userid: usersList[0]!.user.id,
        createdat: new Date(config.startTime + 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: decay1,
        userid: usersList[1]!.user.id,
        createdat: new Date(config.startTime + 2000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: decay2,
        userid: usersList[2]!.user.id,
        createdat: new Date(config.startTime + 3000).toISOString(),
      },
    ])

    // dynamic: 5 solvers (highest count, but must be excluded)
    await upsertDynamicSolves(
      db,
      dynamic,
      usersList.map((u, i) => ({ userId: u.user.id, points: (i + 1) * 10 }))
    )

    const maxSolves = await getMaxSolveCount(db)
    expect(maxSolves).toBe(2)
  })

  test('banned solvers excluded from decay max', async () => {
    const db = getDb()
    const decayId = await createDecayChallenge()
    const a = await generateRealTestUser()
    const b = await generateRealTestUser()
    const c = await generateRealTestUser()
    await db.update(users).set({ banned: true }).where(eq(users.id, c.user.id))

    await db.insert(solves).values([
      {
        id: crypto.randomUUID(),
        challengeid: decayId,
        userid: a.user.id,
        createdat: new Date(config.startTime + 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: decayId,
        userid: b.user.id,
        createdat: new Date(config.startTime + 2000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        challengeid: decayId,
        userid: c.user.id,
        createdat: new Date(config.startTime + 3000).toISOString(),
      },
    ])

    expect(await getMaxSolveCount(db)).toBe(2)
  })

  test('returns zero when there are no decay solves but dynamic exists', async () => {
    const db = getDb()
    const dynamicId = await createDynamicChallenge()
    const { user } = await generateRealTestUser()
    await upsertDynamicSolves(db, dynamicId, [{ userId: user.id, points: 100 }])

    expect(await getMaxSolveCount(db)).toBe(0)
  })
})

describe('scoring kind transitions on existing challenge', () => {
  test('upsertChallenge rejects switching dynamic -> decay when solves exist', async () => {
    const db = getDb()
    const challengeId = await createDynamicChallenge()
    const { user } = await generateRealTestUser()
    await upsertDynamicSolves(db, challengeId, [
      { userId: user.id, points: 100 },
    ])

    await expect(
      upsertChallenge(db, challengeId, {
        scoring: { kind: ChallengeScoringKind.DECAY },
      })
    ).rejects.toThrow(/cannot change scoring kind/)
  })

  test('upsertChallenge allows switching decay -> dynamic when there are no solves', async () => {
    const db = getDb()
    const challengeId = await createDecayChallenge()

    const updated = await upsertChallenge(db, challengeId, {
      scoring: {
        kind: ChallengeScoringKind.DYNAMIC,
        source: {
          transport: DynamicScoringTransport.WEBHOOK,
          secret: 'switch-secret',
        },
      },
    })

    expect(updated.data.scoring?.kind).toBe(ChallengeScoringKind.DYNAMIC)
  })
})
