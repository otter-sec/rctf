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
        solves: z.array(z.string()), // array of challenge ids
      })
    ),
    challenges: z.record(
      z.string(), // challenge id
      z.object({
        name: z.string(),
        category: z.string(),
        solves: z.number(),
        points: z.number(),
        firstSolvers: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
          })
        ),
      })
    ),
  }),
})
