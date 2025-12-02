import { z } from 'zod'
import { response } from '../internal'

export const GoodCtftimeLeaderboard = response('goodCtftimeLeaderboard', {
  status: 200,
  message: 'The CTFtime leaderboard was successfully retrieved.',
  data: z.object({
    standings: z.array(
      z.object({
        pos: z.number().int(),
        team: z.string(),
        score: z.number().int(),
      })
    ),
  }),
})
