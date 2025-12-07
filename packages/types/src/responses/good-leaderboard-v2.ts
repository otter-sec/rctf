import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodLeaderboardV2 = response('goodLeaderboard', {
  status: 200,
  message: 'The leaderboard was retrieved.',
  data: z.object({
    total: z.int(),
    leaderboard: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        score: z.int(),
        avatarUrl: z.nullable(z.string()),
        solves: z.array(
          z.object({
            id: z.string(),
            solveTime: z.int(),
          })
        ),
        division: z.string(),
        divisionPlace: z.int(),
      })
    ),
    challenges: z.record(
      z.string(), // challenge id
      z.object({
        name: z.string(),
        category: z.string(),
        solves: z.int(),
        points: z.int(),
        sortWeight: z.nullable(z.int()),
        firstSolvers: z.array(
          z.object({
            id: z.string(),
          })
        ),
      })
    ),
  }),
})
