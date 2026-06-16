import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodLeaderboard = response('goodLeaderboard', {
  status: 200,
  message: 'The leaderboard was retrieved.',
  data: z.object({
    total: example(z.int(), 128).check(
      z.describe('Total number of ranked teams in the division.')
    ),
    leaderboard: z.array(
      z.object({
        id: example(z.string(), 'team-1a2b3c').check(z.describe('Team ID.')),
        name: example(z.string(), 'otter-sec').check(
          z.describe('Team display name.')
        ),
        score: example(z.int(), 13370).check(z.describe('Total team score.')),
      })
    ),
  }),
})
