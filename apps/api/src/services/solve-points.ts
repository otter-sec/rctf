import type {
  ChallengeData,
  DatabaseClient,
  DatabaseTx,
  ScoreEventSource,
  Solve,
} from '@rctf/db'
import { challenges, scoreEvents, solves, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import type { ScoreContext } from '@rctf/scoring/base'
import { ChallengeScoringKind } from '@rctf/types'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { scoreProvider } from '../providers'
import { challengeIsPublicSql, getPrivateChallenge } from './challenges'
import { getCompetitionTiming, type CompetitionTiming } from './settings'

export const scoringKindOf = (data: {
  scoring?: { kind: ChallengeScoringKind } | null
}): ChallengeScoringKind => data.scoring?.kind ?? ChallengeScoringKind.DECAY

export const scoringConfigChanged = (
  before: ChallengeData | undefined,
  after: ChallengeData
): boolean =>
  !before ||
  before.points?.min !== after.points?.min ||
  before.points?.max !== after.points?.max ||
  JSON.stringify(before.scoring) !== JSON.stringify(after.scoring)

const buildDecayScoreContext = (
  data: ChallengeData,
  solveCount: number,
  maxSolves: number,
  firstSolveTime: number | null,
  timing: CompetitionTiming
): ScoreContext => ({
  minPoints: data.points?.min ?? 0,
  maxPoints: data.points?.max ?? 0,
  solves: solveCount,
  maxSolves,
  eventStartTime: timing.startTime,
  eventEndTime: timing.endTime,
  firstSolveTime,
})

export type RecomputeSource = 'decay-recompute' | 'algo-change' | 'flag'

type NewScoreEvent = {
  id: string
  challengeid: string
  userid: string
  pointsDelta: number
  source: ScoreEventSource
}

const lockChallenge = (tx: DatabaseTx, challengeId: string) =>
  tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${challengeId}, 0))`
  )

export const scoreEvent = (
  challengeid: string,
  userid: string,
  pointsDelta: number,
  source: ScoreEventSource
): NewScoreEvent => ({
  id: crypto.randomUUID(),
  challengeid,
  userid,
  pointsDelta,
  source,
})

const recomputeDecayWithinTx = async (
  tx: DatabaseTx,
  challengeId: string,
  source: RecomputeSource,
  timing: CompetitionTiming
): Promise<{ updatedCount: number; newPoints: number }> => {
  const challenge = await getPrivateChallenge(tx, challengeId)
  if (!challenge) {
    return { updatedCount: 0, newPoints: 0 }
  }

  const kind = challenge.data.scoring?.kind ?? ChallengeScoringKind.DECAY
  if (kind !== ChallengeScoringKind.DECAY) {
    return { updatedCount: 0, newPoints: 0 }
  }

  const existingRows = await tx
    .select({
      id: solves.id,
      userid: solves.userid,
      createdat: solves.createdat,
      points: solves.points,
    })
    .from(solves)
    .innerJoin(users, eq(users.id, solves.userid))
    .where(and(eq(solves.challengeid, challengeId), eq(users.banned, false)))
    .orderBy(asc(solves.createdat))

  const firstSolveTime =
    existingRows.length > 0
      ? new Date(existingRows[0]!.createdat).valueOf()
      : null

  const maxSolves = scoreProvider.requiredFields.includes('maxSolves')
    ? ((
        await tx
          .select({
            max: sql<number>`COALESCE(MAX(c.solve_count), 0)::int`,
          })
          .from(
            sql`(
              SELECT s.challengeid, COUNT(*)::int AS solve_count
              FROM ${solves} s
              INNER JOIN ${users} u ON u.id = s.userid
              WHERE u.banned = false
              GROUP BY s.challengeid
            ) c`
          )
          .then(takeUnique)
      )?.max ?? 0)
    : 0

  const newPoints = scoreProvider.calculate(
    buildDecayScoreContext(
      challenge.data,
      existingRows.length,
      maxSolves,
      firstSolveTime,
      timing
    )
  )

  const changedRows = existingRows.filter(row => row.points !== newPoints)
  if (changedRows.length === 0) {
    return { updatedCount: 0, newPoints }
  }

  await Promise.all([
    tx
      .update(solves)
      .set({ points: newPoints, pointsUpdatedAt: sql`NOW()` })
      .where(
        inArray(
          solves.id,
          changedRows.map(row => row.id)
        )
      ),
    tx
      .insert(scoreEvents)
      .values(
        changedRows.map(row =>
          scoreEvent(challengeId, row.userid, newPoints - row.points, source)
        )
      ),
  ])

  return { updatedCount: changedRows.length, newPoints }
}

export const applyDecayPointsForChallenge = async (
  db: DatabaseClient,
  challengeId: string,
  source: RecomputeSource = 'decay-recompute'
): Promise<{ updatedCount: number; newPoints: number }> => {
  const timing = await getCompetitionTiming(db)
  return await db.transaction(async tx => {
    await lockChallenge(tx, challengeId)
    return recomputeDecayWithinTx(tx, challengeId, source, timing)
  })
}

type DynamicScoreEntry = { userId: string; points: number }

export const upsertDynamicSolves = async (
  db: DatabaseClient,
  challengeId: string,
  entries: DynamicScoreEntry[]
): Promise<{ inserted: number; updated: number; deleted: number }> => {
  return await db.transaction(async tx => {
    await lockChallenge(tx, challengeId)

    const existing = await tx
      .select({
        id: solves.id,
        userid: solves.userid,
        points: solves.points,
      })
      .from(solves)
      .where(eq(solves.challengeid, challengeId))

    // last write wins
    const dedupedEntries = Array.from(
      new Map(entries.map(e => [e.userId, e])).values()
    )

    const byUser = new Map(existing.map(r => [r.userid, r]))

    const events: NewScoreEvent[] = []
    const inserts: Solve[] = []
    const updates: Array<Pick<Solve, 'id' | 'points'>> = []
    const deletes: string[] = []
    const addEvent = (userid: string, delta: number) =>
      events.push(scoreEvent(challengeId, userid, delta, 'feed'))

    const now = new Date().toISOString()

    for (const entry of dedupedEntries) {
      const prior = byUser.get(entry.userId)
      if (!prior) {
        if (entry.points === 0) {
          continue
        }

        inserts.push({
          id: crypto.randomUUID(),
          challengeid: challengeId,
          userid: entry.userId,
          createdat: now,
          source: 'feed',
          points: entry.points,
          pointsUpdatedAt: now,
        })
        addEvent(entry.userId, entry.points)
        continue
      }

      if (prior.points === entry.points) {
        continue
      }

      // negative scores are staying
      if (entry.points === 0) {
        deletes.push(prior.id)
        addEvent(entry.userId, -prior.points)
        continue
      }

      updates.push({ id: prior.id, points: entry.points })
      addEvent(entry.userId, entry.points - prior.points)
    }

    // silently drop inserts whose userid doesn't exist - otherwise
    // the FK would roll the whole tx back
    let validInserts = inserts
    let droppedUserIds = new Set<string>()
    if (inserts.length > 0) {
      const existingUserIds = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          inArray(
            users.id,
            inserts.map(i => i.userid)
          )
        )
        .then(rows => new Set(rows.map(r => r.id)))
      validInserts = inserts.filter(i => existingUserIds.has(i.userid))
      droppedUserIds = new Set(
        inserts.filter(i => !existingUserIds.has(i.userid)).map(i => i.userid)
      )
    }
    const finalEvents = droppedUserIds.size
      ? events.filter(e => !droppedUserIds.has(e.userid))
      : events

    await Promise.all(
      [
        validInserts.length > 0 && tx.insert(solves).values(validInserts),
        updates.length > 0 &&
          tx.execute(sql`
            UPDATE solves SET
              points = v.points,
              points_updated_at = NOW()
            FROM (VALUES ${sql.join(
              updates.map(u => sql`(${u.id}, ${u.points}::int)`),
              sql`, `
            )}) AS v(id, points)
            WHERE solves.id = v.id::text
          `),
        deletes.length > 0 &&
          tx.delete(solves).where(inArray(solves.id, deletes)),
        finalEvents.length > 0 && tx.insert(scoreEvents).values(finalEvents),
      ].filter(Boolean)
    )

    return {
      inserted: validInserts.length,
      updated: updates.length,
      deleted: deletes.length,
    }
  })
}

export const emitBanScoreEvents = async (
  db: DatabaseClient,
  userId: string,
  direction: 'ban' | 'unban'
): Promise<void> => {
  const sign = direction === 'ban' ? -1 : 1
  const userSolves = await db
    .select({ challengeid: solves.challengeid, points: solves.points })
    .from(solves)
    .where(eq(solves.userid, userId))

  const events = userSolves
    .filter(s => s.points !== 0)
    .map(s => scoreEvent(s.challengeid, userId, sign * s.points, 'ban'))
  if (events.length > 0) {
    await db.insert(scoreEvents).values(events)
  }
}

// COALESCE because pre-dynamic-scoring rows have no scoring field at all
const scoringKindIs = (kind: ChallengeScoringKind) =>
  sql`COALESCE(${challenges.data} -> 'scoring' ->> 'kind', ${ChallengeScoringKind.DECAY}) = ${kind}`

export const getDecayChallengeIds = async (
  db: DatabaseClient
): Promise<string[]> => {
  const rows = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(and(challengeIsPublicSql, scoringKindIs(ChallengeScoringKind.DECAY)))
  return rows.map(r => r.id)
}

export type DynamicChallengeInfo = {
  id: string
  data: ChallengeData
}

export const getDynamicChallenges = async (
  db: DatabaseClient
): Promise<DynamicChallengeInfo[]> => {
  return await db
    .select({ id: challenges.id, data: challenges.data })
    .from(challenges)
    .where(scoringKindIs(ChallengeScoringKind.DYNAMIC))
}
