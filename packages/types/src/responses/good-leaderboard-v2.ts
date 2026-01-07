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
        countryCode: z.nullable(z.string()),
        statusText: z.nullable(z.string()),
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
  }),
})
