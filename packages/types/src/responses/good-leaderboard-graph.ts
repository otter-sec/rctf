import { z } from 'zod'

import { response } from '../internal'

export const GoodLeaderboardGraph = response('goodLeaderboardGraph', {
  status: 200,
  message: 'The leaderboard graph was retrieved.',
  data: z.object({
    graph: z.array(
      z.object({
        points: z.array(
          z.object({
            time: z.number().int(),
            score: z.number().int(),
          })
        ),
        id: z.string(),
        name: z.string(),
      })
    ),
  }),
})
