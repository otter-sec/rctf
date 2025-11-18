import type { ChallengeData, DatabaseClient, User } from '@rctf/db'
import {
  getChallengeDynamicPointsValue,
  getUserScore,
} from '../cache/leaderboard'
import type { TypedRedis } from '../cache/scripts'
import { getUserChallengeSolves } from './challenges'
import { getUser } from './users'

export type FullUser = Omit<User, 'email' | 'ctftimeId'> & {
  email: string | null
  ctftimeId: string | null
  score: number
  globalPlace: number | null
  divisionPlace: number | null
  solves: (Omit<ChallengeData, 'points'> & {
    id: string
    createdAt: number
    solves: number | null
    points: number | null
  })[]
}

export const getFullUser = async (
  db: DatabaseClient,
  redis: TypedRedis,
  user: User
): Promise<FullUser> => {
  const [solves, userScore] = await Promise.all([
    getUserChallengeSolves(db, user.id),
    getUserScore(redis, user.id),
  ])

  const challengeScores = await getChallengeDynamicPointsValue(
    redis,
    solves.map(item => item.solve.challengeid)
  )

  return {
    ...user,
    email: user.email ?? null,
    ctftimeId: user.ctftimeId ?? null,
    score: userScore.score ?? 0,
    globalPlace: userScore.place,
    divisionPlace: userScore.divisionPlace,
    solves: solves.map((item, index) => ({
      ...item.challengeData,
      id: item.solve.challengeid,
      createdAt: new Date(item.solve.createdat).getTime(),
      solves: challengeScores[index]?.solves ?? null,
      points: challengeScores[index]?.score ?? null,
    })),
  }
}

export const getFullUserFromId = async (
  db: DatabaseClient,
  redis: TypedRedis,
  id: string
): Promise<FullUser | undefined> => {
  const user = await getUser(db, id)
  if (!user) {
    return undefined
  }
  return await getFullUser(db, redis, user)
}
