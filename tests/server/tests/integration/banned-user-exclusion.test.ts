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
import { beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import {
  countNonBannedSolvesForChallenge,
  getChallengeSolves,
  getDynamicScoresForUsers,
  getLeaderboardChallengeData,
  getUserChallengeSolves,
} from '../../../../apps/api/src/services/challenges'
import { getApp } from '../../app'
import { generateRealTestUser } from '../../util'

let app: Hono<any>
const getDb = () => createDatabase(config.database.sql).db

beforeAll(async () => {
  app = await getApp()
})

const now = () => new Date().toISOString()

const decayChallengeData = (): ChallengeData => ({
  name: crypto.randomUUID(),
  description: '',
  category: 'misc',
  author: 'test',
  files: [],
  flag: crypto.randomUUID(),
  tiebreakEligible: true,
  points: { min: 100, max: 500 },
})

const dynamicChallengeData = (): ChallengeData => ({
  name: crypto.randomUUID(),
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
      secret: 'banned-exclusion-secret',
    },
  },
})

const insertSolve = (
  userId: string,
  challengeId: string,
  source: 'flag' | 'feed',
  points: number
) =>
  getDb().insert(solves).values({
    id: crypto.randomUUID(),
    challengeid: challengeId,
    userid: userId,
    createdat: now(),
    source,
    points,
    pointsUpdatedAt: now(),
  })

const insertFeedEvent = (
  userId: string,
  challengeId: string,
  delta: number,
  eventAt: string
) =>
  getDb().insert(scoreEvents).values({
    id: crypto.randomUUID(),
    challengeid: challengeId,
    userid: userId,
    pointsDelta: delta,
    source: 'feed',
    eventAt,
  })

type Scenario = {
  activeId: string
  bannedId: string
  challengeId: string
  cleanup: () => Promise<void>
}

const setupScenario = async (kind: 'decay' | 'dynamic'): Promise<Scenario> => {
  const db = getDb()
  const { user: active, cleanup: cleanupActive } = await generateRealTestUser()
  const { user: banned, cleanup: cleanupBanned } = await generateRealTestUser()
  await db.update(users).set({ banned: true }).where(eq(users.id, banned.id))

  const challengeId = crypto.randomUUID()
  await db.insert(challenges).values({
    id: challengeId,
    data: kind === 'decay' ? decayChallengeData() : dynamicChallengeData(),
  })

  if (kind === 'decay') {
    await insertSolve(active.id, challengeId, 'flag', 250)
    await insertSolve(banned.id, challengeId, 'flag', 250)
  } else {
    await insertSolve(active.id, challengeId, 'feed', 300)
    await insertSolve(banned.id, challengeId, 'feed', 200)
    const batchAt = now()
    await insertFeedEvent(active.id, challengeId, 300, batchAt)
    await insertFeedEvent(banned.id, challengeId, 200, batchAt)
  }

  return {
    activeId: active.id,
    bannedId: banned.id,
    challengeId,
    cleanup: async () => {
      await db
        .delete(scoreEvents)
        .where(eq(scoreEvents.challengeid, challengeId))
      await db.delete(solves).where(eq(solves.challengeid, challengeId))
      await db.delete(challenges).where(eq(challenges.id, challengeId))
      await cleanupActive()
      await cleanupBanned()
    },
  }
}

describe('banned user exclusion (regression)', () => {
  describe('decay solve queries', () => {
    test('getChallengeSolves omits banned solvers', async () => {
      const s = await setupScenario('decay')
      try {
        const result = await getChallengeSolves(getDb(), s.challengeId, 100, 0)
        const solverIds = result.map(row => row.solve.userid)
        expect(solverIds).toContain(s.activeId)
        expect(solverIds).not.toContain(s.bannedId)
      } finally {
        await s.cleanup()
      }
    })

    test('countNonBannedSolvesForChallenge counts only active solvers', async () => {
      const s = await setupScenario('decay')
      try {
        const count = await countNonBannedSolvesForChallenge(
          getDb(),
          s.challengeId
        )
        expect(count).toBe(1)
      } finally {
        await s.cleanup()
      }
    })

    test('getUserChallengeSolves hides a banned user own solves', async () => {
      const s = await setupScenario('decay')
      try {
        const activeSolves = await getUserChallengeSolves(getDb(), s.activeId)
        expect(
          activeSolves.some(item => item.solve.challengeid === s.challengeId)
        ).toBe(true)

        const bannedSolves = await getUserChallengeSolves(getDb(), s.bannedId)
        expect(bannedSolves).toHaveLength(0)
      } finally {
        await s.cleanup()
      }
    })

    test('getLeaderboardChallengeData drops banned solves and userInfo', async () => {
      const s = await setupScenario('decay')
      try {
        const data = await getLeaderboardChallengeData(getDb(), [
          s.activeId,
          s.bannedId,
        ])
        expect(data.solves.get(s.activeId)?.length ?? 0).toBe(1)
        expect(data.solves.get(s.bannedId) ?? []).toHaveLength(0)
        expect(data.userInfo.has(s.activeId)).toBe(true)
        expect(data.userInfo.has(s.bannedId)).toBe(false)
      } finally {
        await s.cleanup()
      }
    })
  })

  describe('dynamic score queries', () => {
    test('getDynamicScoresForUsers excludes banned current points and deltas', async () => {
      const s = await setupScenario('dynamic')
      try {
        const scores = await getDynamicScoresForUsers(
          getDb(),
          [s.activeId, s.bannedId],
          [s.challengeId]
        )

        const activeScore = scores
          .get(s.activeId)
          ?.find(entry => entry.id === s.challengeId)
        expect(activeScore?.points).toBe(300)
        expect(activeScore?.pointDelta).toBe(300)

        expect(scores.get(s.bannedId) ?? []).toHaveLength(0)
      } finally {
        await s.cleanup()
      }
    })

    test('getLeaderboardChallengeData drops banned dynamic scores', async () => {
      const s = await setupScenario('dynamic')
      try {
        const data = await getLeaderboardChallengeData(getDb(), [
          s.activeId,
          s.bannedId,
        ])
        const activeScore = data.dynamicScores
          .get(s.activeId)
          ?.find(entry => entry.id === s.challengeId)
        expect(activeScore?.points).toBe(300)
        expect(data.dynamicScores.get(s.bannedId) ?? []).toHaveLength(0)
      } finally {
        await s.cleanup()
      }
    })
  })
})
