import type {
  ChallengeData,
  DatabaseClient,
  DatabaseTx,
  ScoreEventSource,
  Solve,
} from '@rctf/db'
import { scoreEvents, solves, users } from '@rctf/db'
import type { ScoreContext } from '@rctf/scoring/base'
import { asc, eq, inArray, sql } from 'drizzle-orm'
import type { PinoLogger } from 'hono-pino'
import type { TypedRedis } from '../cache/scripts'
import { scoreProvider } from '../providers'
import { requestChallengeRecompute } from '../workers'
import {
  getDecayChallenge,
  getDecayChallenges,
  getMaxSolveCount,
  lockChallenge,
  type DecayChallenge,
} from './challenges'
import { getCompetitionTiming, type CompetitionTiming } from './settings'

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

export type RecomputeSource =
  | 'decay-recompute'
  | 'algo-change'
  | 'flag'
  | 'ban'
  | 'delete'

export const recomputeSourceCanChangeMaxSolves = (
  source: RecomputeSource
): boolean =>
  source !== 'algo-change' && scoreProvider.requiredFields.includes('maxSolves')

type NewScoreEvent = {
  id: string
  challengeid: string
  userid: string
  pointsDelta: number
  source: ScoreEventSource
}

const scoreEvent = (
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

const requiresMaxSolves = (): boolean =>
  scoreProvider.requiredFields.includes('maxSolves')

const recomputeDecayWithinTx = async (
  tx: DatabaseTx,
  challenge: DecayChallenge,
  source: RecomputeSource,
  timing: CompetitionTiming,
  maxSolves: number
): Promise<{ updatedCount: number; newPoints: number }> => {
  const rows = await tx
    .select({
      id: solves.id,
      userid: solves.userid,
      createdat: solves.createdat,
      points: solves.points,
      banned: users.banned,
    })
    .from(solves)
    .innerJoin(users, eq(users.id, solves.userid))
    .where(eq(solves.challengeid, challenge.id))
    .orderBy(asc(solves.createdat))

  const activeRows = rows.filter(row => !row.banned)
  const firstSolveTime = activeRows[0]
    ? new Date(activeRows[0].createdat).valueOf()
    : null

  const newPoints = scoreProvider.calculate(
    buildDecayScoreContext(
      challenge.data,
      activeRows.length,
      maxSolves,
      firstSolveTime,
      timing
    )
  )

  const changedRows = rows.filter(row => row.points !== newPoints)
  if (changedRows.length === 0) {
    return { updatedCount: 0, newPoints }
  }

  await tx
    .update(solves)
    .set({ points: newPoints, pointsUpdatedAt: sql`NOW()` })
    .where(
      inArray(
        solves.id,
        changedRows.map(row => row.id)
      )
    )

  const events = changedRows
    .filter(row => !row.banned)
    .map(row =>
      scoreEvent(challenge.id, row.userid, newPoints - row.points, source)
    )
  if (events.length > 0) {
    await tx.insert(scoreEvents).values(events)
  }

  return { updatedCount: changedRows.length, newPoints }
}

export const applyDecayPointsForChallenge = async (
  db: DatabaseClient,
  challengeId: string,
  source: RecomputeSource = 'decay-recompute',
  maxSolvesOverride?: number
): Promise<{ updatedCount: number; newPoints: number }> => {
  const timing = await getCompetitionTiming(db)
  return await db.transaction(async tx => {
    await lockChallenge(tx, challengeId)
    const challenge = await getDecayChallenge(tx, challengeId)
    if (!challenge) {
      return { updatedCount: 0, newPoints: 0 }
    }
    const maxSolves =
      maxSolvesOverride ??
      (requiresMaxSolves() ? await getMaxSolveCount(tx) : 0)
    return recomputeDecayWithinTx(tx, challenge, source, timing, maxSolves)
  })
}

export const applyChallengeConfigChange = async (
  db: DatabaseClient,
  redis: TypedRedis,
  log: PinoLogger,
  challengeId: string
): Promise<void> => {
  await applyDecayPointsForChallenge(db, challengeId, 'algo-change').catch(
    err =>
      log.error(
        { err, challengeId },
        'failed to recompute points after challenge config change'
      )
  )
  requestChallengeRecompute(redis, challengeId, 'algo-change')
}

export const applyDecayPointsForAllChallenges = async (
  db: DatabaseClient,
  source: RecomputeSource = 'decay-recompute'
): Promise<{ updatedCount: number; challengeCount: number }> => {
  const timing = await getCompetitionTiming(db)
  return await db.transaction(async tx => {
    const decayChallenges = await getDecayChallenges(tx)
    for (const challenge of decayChallenges) {
      await lockChallenge(tx, challenge.id)
    }

    const maxSolves = requiresMaxSolves() ? await getMaxSolveCount(tx) : 0
    let updatedCount = 0
    for (const challenge of decayChallenges) {
      const { updatedCount: count } = await recomputeDecayWithinTx(
        tx,
        challenge,
        source,
        timing,
        maxSolves
      )
      updatedCount += count
    }

    return { updatedCount, challengeCount: decayChallenges.length }
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
  await emitUserSolveScoreEvents(db, userId, sign, 'ban')
}

export const emitUserDeletionScoreEvents = async (
  db: DatabaseClient,
  userId: string
): Promise<void> => {
  await emitUserSolveScoreEvents(db, userId, -1, 'delete')
}

const emitUserSolveScoreEvents = async (
  db: DatabaseClient,
  userId: string,
  sign: -1 | 1,
  source: ScoreEventSource
): Promise<void> => {
  const userSolves = await db
    .select({ challengeid: solves.challengeid, points: solves.points })
    .from(solves)
    .where(eq(solves.userid, userId))

  const events = userSolves
    .filter(s => s.points !== 0)
    .map(s => scoreEvent(s.challengeid, userId, sign * s.points, source))
  if (events.length > 0) {
    await db.insert(scoreEvents).values(events)
  }
}
