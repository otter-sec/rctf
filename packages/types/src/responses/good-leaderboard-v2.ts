import { z } from 'zod'
import { response } from '../internal'

export const GoodLeaderboardV2 = response('goodLeaderboard', {
  status: 200,
  message: 'The leaderboard was retrieved.',
  data: z.object({
    total: z.number().int(),
    leaderboard: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        score: z.number().int(),
        avatarUrl: z.string().nullable(),
        solves: z.array(
          z.object({
            id: z.string(),
            solveTime: z.number().int(),
          })
        ),
        division: z.string(),
        divisionPlace: z.number().int(),
      })
    ),
    challenges: z.record(
      z.string(), // challenge id
      z.object({
        name: z.string(),
        category: z.string(),
        solves: z.number().int(),
        points: z.number().int(),
        sortWeight: z.number().int().nullable(),
        firstSolvers: z.array(
          z.object({
            id: z.string(),
          })
        ),
      })
    ),
  }),
})
