import type { DatabaseClient, User } from '@rctf/db'
import { getUserScoreAndChallengePoints } from '../cache/leaderboard'
import type { TypedRedis } from '../cache/scripts'
import { getUserChallengeSolves } from './challenges'
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

export type FullUser = Omit<User, 'email' | 'ctftimeId'> & {
  email: string | null
  ctftimeId: string | null
  score: number
  globalPlace: number | null
  divisionPlace: number | null
  solves: SolveData[]
}

export const getFullUser = async (
  db: DatabaseClient,
  redis: TypedRedis,
  user: User
): Promise<FullUser> => {
  const solves = await getUserChallengeSolves(db, user.id)
  const { userScore, challengeScores } = await getUserScoreAndChallengePoints(
    redis,
    user.id,
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
      bloodIndex: item.bloodIndex,
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
