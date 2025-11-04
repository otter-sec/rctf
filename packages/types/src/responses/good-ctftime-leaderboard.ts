import { z } from 'zod'

import { response } from '../dsl'

export const GoodCtftimeLeaderboard = response('goodCtftimeLeaderboard', {
  status: 200,
  message: '',
  data: z.object({
    standings: z.array(
      z.object({
        pos: z.number().int(),
        team: z.string(),
        score: z.number(),
      })
    ),
  }),
})
