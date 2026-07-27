import { config } from '@rctf/config'
import {
  challenges,
  ChallengeScoringKind,
  createDatabase,
  DynamicScoringTransport,
  scoreEvents,
  type ChallengeData,
} from '@rctf/db'
import { beforeAll, describe, expect, test } from 'bun:test'
import { inArray } from 'drizzle-orm'
import { getGraphForEntries } from '../../../../apps/api/src/cache/leaderboard'
import { createRedis } from '../../../../apps/api/src/util/redis'
import { getApp } from '../../app'
import { generateRealTestUser } from '../../util'

const getDb = () => createDatabase(config.database.sql).db

const dynamicChallengeData = (hidden: boolean): ChallengeData => ({
  name: crypto.randomUUID(),
  description: '',
  category: 'dynamic',
  author: 'test',
  files: [],
  flags: [],
  tiebreakEligible: true,
  points: { min: 0, max: 0 },
  hidden,
  scoring: {
    kind: ChallengeScoringKind.DYNAMIC,
    source: {
      transport: DynamicScoringTransport.WEBHOOK,
      secret: 'graph-scope-secret',
    },
  },
})

describe('dynamic graph public scoping (regression)', () => {
  beforeAll(async () => {
    await getApp()
  })

  test('excludes feed contributions from hidden dynamic challenges', async () => {
    const db = getDb()
    const redis = await createRedis()
    const { user, cleanup } = await generateRealTestUser()
    const publicId = crypto.randomUUID()
    const hiddenId = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.insert(challenges).values([
      { id: publicId, data: dynamicChallengeData(false) },
      { id: hiddenId, data: dynamicChallengeData(true) },
    ])
    await db.insert(scoreEvents).values([
      {
        id: crypto.randomUUID(),
        challengeid: publicId,
        userid: user.id,
        pointsDelta: 100,
        source: 'feed',
        eventAt: now,
      },
      {
        id: crypto.randomUUID(),
        challengeid: hiddenId,
        userid: user.id,
        pointsDelta: 500,
        source: 'feed',
        eventAt: now,
      },
    ])

    try {
      const [entry] = await getGraphForEntries(db, redis, [
        { id: user.id, name: user.name, score: 600 },
      ])
      const dynamicPoints = entry?.dynamicPoints ?? []
      // only the public challenge's feed total (100) is reflected, not the
      // hidden one (+500): one "current" sample point plus the single feed
      // event => exactly 2 points, both at the public cumulative of 100
      expect(dynamicPoints.length).toBe(2)
      expect(dynamicPoints[0]?.score).toBe(100)
      expect(dynamicPoints[1]?.score).toBe(100)
    } finally {
      await db
        .delete(scoreEvents)
        .where(inArray(scoreEvents.challengeid, [publicId, hiddenId]))
      await db
        .delete(challenges)
        .where(inArray(challenges.id, [publicId, hiddenId]))
      await cleanup()
    }
  })
})
