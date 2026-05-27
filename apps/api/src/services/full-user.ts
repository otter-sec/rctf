import type { DatabaseClient, User } from '@rctf/db'
import { challenges, users } from '@rctf/db'
import { takeUnique } from '@rctf/db/util'
import { eq, inArray } from 'drizzle-orm'
import {
  getDynamicScoresForUsers,
  getPublicDynamicChallengeIds,
  getUserChallengeSolves,
} from './challenges'
import { getUser } from './users'

export type SolveData = {
  category: string
  name: string
  id: string
  createdAt: number
  solves: number | null
  points: number | null
  bloodIndex: number | null
}

export type DynamicScoreData = {
  id: string
  points: number
  pointDelta: number
}

export type FullUser = Omit<User, 'email' | 'ctftimeId'> & {
  email: string | null
  ctftimeId: string | null
  score: number
  globalPlace: number | null
  divisionPlace: number | null
  solves: SolveData[]
  dynamicScores: DynamicScoreData[]
}

export const getFullUser = async (
  db: DatabaseClient,
  user: User
): Promise<FullUser> => {
  const [solves, freshRanks, dynamicChallengeIds] = await Promise.all([
    getUserChallengeSolves(db, user.id),
    db
      .select({
        score: users.score,
        globalRank: users.globalRank,
        divisionRank: users.divisionRank,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .then(takeUnique),
    getPublicDynamicChallengeIds(db),
  ])

  const challengeIds = solves.map(item => item.solve.challengeid)
  const challengeScores = new Map<
    string,
    { score: number; solveCount: number }
  >()
  const dynamicScores = await getDynamicScoresForUsers(
    db,
    [user.id],
    dynamicChallengeIds
  )

  if (challengeIds.length > 0) {
    const challRows = await db
      .select({
        id: challenges.id,
        score: challenges.score,
        solveCount: challenges.solveCount,
      })
      .from(challenges)
      .where(inArray(challenges.id, challengeIds))

    for (const row of challRows) {
      challengeScores.set(row.id, {
        score: row.score,
        solveCount: row.solveCount,
      })
    }
  }

  return {
    ...user,
    email: user.email ?? null,
    ctftimeId: user.ctftimeId ?? null,
    score: freshRanks?.score ?? 0,
    globalPlace: freshRanks?.globalRank ?? null,
    divisionPlace: freshRanks?.divisionRank ?? null,
    dynamicScores: dynamicScores.get(user.id) ?? [],
    solves: solves.map(item => {
      const challScore = challengeScores.get(item.solve.challengeid)
      return {
        ...item.challengeData,
        id: item.solve.challengeid,
        createdAt: new Date(item.solve.createdat).getTime(),
        solves: challScore?.solveCount ?? null,
        points: challScore?.score ?? null,
        bloodIndex: item.bloodIndex,
      }
    }),
  }
}

export const getFullUserFromId = async (
  db: DatabaseClient,
  id: string
): Promise<FullUser | undefined> => {
  const user = await getUser(db, id)
  if (!user || user.banned) {
    return undefined
  }
  return await getFullUser(db, user)
}
