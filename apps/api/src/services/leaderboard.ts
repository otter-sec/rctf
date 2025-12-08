import { config } from '@rctf/config'
import type { DatabaseClient } from '@rctf/db'
import { challenges, solves, users } from '@rctf/db'
import { asc } from 'drizzle-orm'
import type {
  CalculatedLeaderboard,
  InternalChallengeInfo,
  InternalUserInfo,
  Sample,
} from '../cache/leaderboard'
import { scoreProvider } from '../providers'

const getUsers = async (
  db: DatabaseClient
): Promise<Map<string, InternalUserInfo>> => {
  const dbUsers = await db
    .select({
      id: users.id,
      name: users.name,
      division: users.division,
    })
    .from(users)

  const result = new Map<string, InternalUserInfo>()
  for (let i = 0; i < dbUsers.length; i++) {
    const u = dbUsers[i]
    if (!u) {
      continue
    }

    result.set(u.id, {
      id: u.id,
      name: u.name,
      division: u.division ?? null,
      score: 0,
      lastSolve: undefined,
      lastTiebreakEligibleSolve: undefined,
      solvedChallengeIds: [],
    })
  }
  return result
}

const getChallenges = async (
  db: DatabaseClient
): Promise<Map<string, InternalChallengeInfo>> => {
  const dbChalls = await db
    .select({
      id: challenges.id,
      data: challenges.data,
    })
    .from(challenges)

  const result = new Map<string, InternalChallengeInfo>()
  for (let i = 0; i < dbChalls.length; i++) {
    const ch = dbChalls[i]
    if (!ch) {
      continue
    }

    const points = ch.data.points ?? { min: 0, max: 0 }
    result.set(ch.id, {
      id: ch.id,
      name: ch.data.name ?? '',
      category: ch.data.category ?? '',
      tiebreakEligible: ch.data.tiebreakEligible ?? false,
      solves: 0,
      score: 0,
      minPoints: points.min ?? 0,
      maxPoints: points.max ?? 0,
      sortWeight: ch.data.sortWeight ?? null,
    })
  }
  return result
}

export const calculateLeaderboard = async (
  db: DatabaseClient
): Promise<CalculatedLeaderboard> => {
  const now = Date.now()
  const userInfos = await getUsers(db)
  const challengeInfos = await getChallenges(db)

  const dbSolves = await db
    .select({
      challengeid: solves.challengeid,
      userid: solves.userid,
      createdat: solves.createdat,
    })
    .from(solves)
    .orderBy(asc(solves.createdat))

  const numberOfBloods = 3
  const firstBloods = new Map<string, string[]>()

  let solveIndex = 0
  const applySolvesUntil = (untilEpochMs: number): boolean => {
    let changed = false

    for (; solveIndex < dbSolves.length; solveIndex++) {
      const s = dbSolves[solveIndex]
      if (!s) {
        continue
      }

      const createdAtMs = new Date(s.createdat).valueOf()
      if (createdAtMs > untilEpochMs) {
        break
      }

      const chal = challengeInfos.get(s.challengeid)
      const user = userInfos.get(s.userid)
      if (!chal || !user) {
        continue
      }

      let bloods = firstBloods.get(s.challengeid)
      if (!bloods) {
        bloods = []
        firstBloods.set(s.challengeid, bloods)
      }
      if (bloods.length < numberOfBloods) {
        bloods.push(s.userid)
      }

      chal.solves++
      user.lastSolve = createdAtMs
      if (chal.tiebreakEligible) {
        user.lastTiebreakEligibleSolve = createdAtMs
      }
      user.solvedChallengeIds.push(s.challengeid)
      changed = true
    }

    if (!changed) {
      return false
    }

    // recompute challenge dynamic scores
    const maxSolves = Math.max(
      ...Array.from(challengeInfos.values()).map(ch => ch.solves)
    )
    for (const [, ch] of challengeInfos) {
      ch.score = scoreProvider.calculate(
        ch.minPoints,
        ch.maxPoints,
        maxSolves,
        ch.solves
      )
    }

    // recompute user scores
    for (const [, u] of userInfos) {
      u.score = 0

      for (let i = 0; i < u.solvedChallengeIds.length; i++) {
        const ch = challengeInfos.get(u.solvedChallengeIds[i] ?? '')
        if (!ch) {
          continue
        }

        u.score += ch.score
      }
    }

    return true
  }

  const usersWithScores = new Set<string>()
  const samples: CalculatedLeaderboard['samples'] = []
  let prevScoreMap: Map<string, number> | null = null

  const runSample = (t: number): void => {
    applySolvesUntil(t)

    const userScores: Sample['userScores'] = []
    for (const [id, u] of userInfos) {
      if (u.score > 0) {
        userScores.push({ id, score: u.score })
        usersWithScores.add(id)
      }
    }

    // dedupe
    if (prevScoreMap !== null) {
      let changed = false
      if (userScores.length !== prevScoreMap.size) {
        changed = true
      } else {
        for (const { id, score } of userScores) {
          if (prevScoreMap.get(id) !== score) {
            changed = true
            break
          }
        }
      }
      if (!changed) {
        return
      }
    }

    prevScoreMap = new Map(userScores.map(({ id, score }) => [id, score]))
    samples.push({ time: t, userScores })
  }

  const graphSampleTime = config.leaderboard.graphSampleTime
  if (graphSampleTime > 0 && dbSolves.length > 0) {
    const firstSolveTime = new Date(dbSolves[0]!.createdat).valueOf()
    const effectiveStart = Math.max(config.startTime, firstSolveTime)

    const start = Math.ceil(effectiveStart / graphSampleTime) * graphSampleTime
    const end = Math.min(
      Math.floor(config.endTime / graphSampleTime) * graphSampleTime,
      now
    )

    for (let i = start; i <= end; i += graphSampleTime) {
      runSample(i)

      if (solveIndex >= dbSolves.length) {
        break
      }
    }
  }

  // Run up to now (but dedupe if scores are the same)
  runSample(now)

  const compareUsers = (a: InternalUserInfo, b: InternalUserInfo): number => {
    // 1. Score difference
    const scoreDiff = b.score - a.score
    if (scoreDiff !== 0) {
      return scoreDiff
    }

    // 2. Last tiebreak eligible solve difference
    const lastTiebreakEligibleSolveDiff =
      (a.lastTiebreakEligibleSolve ?? Infinity) -
      (b.lastTiebreakEligibleSolve ?? Infinity)
    if (
      !isNaN(lastTiebreakEligibleSolveDiff) &&
      lastTiebreakEligibleSolveDiff !== 0
    ) {
      return lastTiebreakEligibleSolveDiff
    }

    // 3. Last solve difference
    return (a.lastSolve ?? Infinity) - (b.lastSolve ?? Infinity)
  }

  return {
    leaderboardUpdate: now,
    users: Array.from(userInfos.values())
      .filter(u => u.lastSolve !== undefined)
      .sort(compareUsers)
      .map(u => ({
        id: u.id,
        name: u.name,
        division: u.division,
        score: u.score,
        hadAnySolve: true,
      })),
    challengeInfos: challengeInfos,
    firstBloods,
    samples,
  }
}
