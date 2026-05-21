import type { ChallengeData, DatabaseClient, DatabaseTx } from '@rctf/db'
import { challenges, scoreEvents, solves, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import type { ScoreContext } from '@rctf/scoring/base'
import { ChallengeScoringKind, DynamicScoresMode } from '@rctf/types'
import { and, asc, eq, sql } from 'drizzle-orm'
import { scoreProvider } from '../providers'
import { challengeIsPublicSql, getPrivateChallenge } from './challenges'
import { getCompetitionTiming, type CompetitionTiming } from './settings'

export const scoringKindOf = (data: {
  scoring?: { kind: ChallengeScoringKind } | null
}): ChallengeScoringKind => data.scoring?.kind ?? ChallengeScoringKind.DECAY

export const scoringConfigChanged = (
  before: ChallengeData | undefined,
  after: ChallengeData
): boolean => {
  if (!before) {
    return true
  }
  if (before.points?.min !== after.points?.min) {
    return true
  }
  if (before.points?.max !== after.points?.max) {
    return true
  }
  return JSON.stringify(before.scoring) !== JSON.stringify(after.scoring)
}

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

type RecomputeSource = 'decay-recompute' | 'algo-change' | 'flag'
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
        sql`${solves.id} IN (${sql.join(
          changedRows.map(row => sql`${row.id}`),
          sql`, `
        )})`
      ),
    tx.insert(scoreEvents).values(
      changedRows.map(row => ({
        id: crypto.randomUUID(),
        challengeid: challengeId,
        userid: row.userid,
        pointsDelta: newPoints - row.points,
        source,
      }))
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
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${challengeId}, 0))`
    )
    return recomputeDecayWithinTx(tx, challengeId, source, timing)
  })
}

export const recomputeChallengePoints = async (
  db: DatabaseClient,
  challengeId: string,
  source: 'decay-recompute' | 'algo-change' | 'flag' = 'decay-recompute'
): Promise<{
  updatedCount: number
  newPoints: number
  kind: ChallengeScoringKind
}> => {
  const challenge = await getPrivateChallenge(db, challengeId)
  if (!challenge) {
    return { updatedCount: 0, newPoints: 0, kind: ChallengeScoringKind.DECAY }
  }

  if (scoringKindOf(challenge.data) === ChallengeScoringKind.DYNAMIC) {
    return {
      updatedCount: 0,
      newPoints: 0,
      kind: ChallengeScoringKind.DYNAMIC,
    }
  }

  const r = await applyDecayPointsForChallenge(db, challengeId, source)
  return { ...r, kind: ChallengeScoringKind.DECAY }
}

type DynamicScoreEntry = { userId: string; points: number }

export const upsertDynamicSolves = async (
  db: DatabaseClient,
  challengeId: string,
  entries: DynamicScoreEntry[],
  opts: { mode: DynamicScoresMode } = { mode: DynamicScoresMode.REPLACEMENT }
): Promise<{ inserted: number; updated: number; deleted: number }> => {
  return await db.transaction(async tx => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${challengeId}, 0))`
    )

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
    const requestedIds = new Set(dedupedEntries.map(e => e.userId))

    const events: Array<{
      id: string
      challengeid: string
      userid: string
      pointsDelta: number
      source: 'feed'
    }> = []
    const inserts: Array<{
      id: string
      challengeid: string
      userid: string
      createdat: string
      source: 'feed'
      points: number
      pointsUpdatedAt: string
    }> = []
    const updates: Array<{ id: string; points: number }> = []
    const deletes: string[] = []

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
        events.push({
          id: crypto.randomUUID(),
          challengeid: challengeId,
          userid: entry.userId,
          pointsDelta: entry.points,
          source: 'feed',
        })
        continue
      }

      if (prior.points === entry.points) {
        continue
      }

      // negative scores are staying
      if (entry.points === 0) {
        deletes.push(prior.id)
        events.push({
          id: crypto.randomUUID(),
          challengeid: challengeId,
          userid: entry.userId,
          pointsDelta: -prior.points,
          source: 'feed',
        })
        continue
      }

      updates.push({ id: prior.id, points: entry.points })
      events.push({
        id: crypto.randomUUID(),
        challengeid: challengeId,
        userid: entry.userId,
        pointsDelta: entry.points - prior.points,
        source: 'feed',
      })
    }

    if (opts.mode === DynamicScoresMode.REPLACEMENT) {
      for (const row of existing) {
        if (requestedIds.has(row.userid)) {
          continue
        }
        deletes.push(row.id)
        events.push({
          id: crypto.randomUUID(),
          challengeid: challengeId,
          userid: row.userid,
          pointsDelta: -row.points,
          source: 'feed',
        })
      }
    }

    // silently drop inserts whose userid doesn't exist - otherwise
    // the FK would roll the whole tx back
    let validInserts = inserts
    if (inserts.length > 0) {
      const existingUserIds = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          sql`${users.id} IN (${sql.join(
            inserts.map(i => sql`${i.userid}`),
            sql`, `
          )})`
        )
        .then(rows => new Set(rows.map(r => r.id)))
      validInserts = inserts.filter(i => existingUserIds.has(i.userid))
    }
    const droppedInsertUserIds = new Set(
      inserts.filter(i => !validInserts.includes(i)).map(i => i.userid)
    )
    const finalEvents =
      droppedInsertUserIds.size === 0
        ? events
        : events.filter(e => !droppedInsertUserIds.has(e.userid))

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
          tx.delete(solves).where(
            sql`${solves.id} IN (${sql.join(
              deletes.map(id => sql`${id}`),
              sql`, `
            )})`
          ),
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

export const emitBanReversalEvents = async (
  db: DatabaseClient,
  userId: string
): Promise<void> => {
  const userSolves = await db
    .select({
      id: solves.id,
      challengeid: solves.challengeid,
      points: solves.points,
    })
    .from(solves)
    .where(eq(solves.userid, userId))

  if (userSolves.length === 0) {
    return
  }

  const eventsToInsert = userSolves
    .filter(s => s.points !== 0)
    .map(s => ({
      id: crypto.randomUUID(),
      challengeid: s.challengeid,
      userid: userId,
      pointsDelta: -s.points,
      source: 'ban' as const,
    }))
  if (eventsToInsert.length === 0) {
    return
  }
  await db.insert(scoreEvents).values(eventsToInsert)
}

export const emitUnbanRestoreEvents = async (
  db: DatabaseClient,
  userId: string
): Promise<void> => {
  const userSolves = await db
    .select({
      id: solves.id,
      challengeid: solves.challengeid,
      points: solves.points,
    })
    .from(solves)
    .where(eq(solves.userid, userId))

  if (userSolves.length === 0) {
    return
  }

  const eventsToInsert = userSolves
    .filter(s => s.points !== 0)
    .map(s => ({
      id: crypto.randomUUID(),
      challengeid: s.challengeid,
      userid: userId,
      pointsDelta: s.points,
      source: 'ban' as const,
    }))
  if (eventsToInsert.length === 0) {
    return
  }
  await db.insert(scoreEvents).values(eventsToInsert)
}

export const emitSolveDeletionEvent = async (
  db: DatabaseClient,
  params: { challengeId: string; userId: string; points: number }
): Promise<void> => {
  if (params.points === 0) {
    return
  }
  await db.insert(scoreEvents).values({
    id: crypto.randomUUID(),
    challengeid: params.challengeId,
    userid: params.userId,
    pointsDelta: -params.points,
    source: 'delete',
  })
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
