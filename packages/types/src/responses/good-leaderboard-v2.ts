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
      })
    ),
  }),
})
