import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodCtftimeLeaderboard = response('goodCtftimeLeaderboard', {
  status: 200,
  message: 'The CTFtime leaderboard was successfully retrieved.',
  data: z.object({
    standings: z.array(
      z.object({
        pos: example(z.int(), 1).check(
          z.describe("The team's rank, starting at 1.")
        ),
        team: example(z.string(), 'otter-sec').check(
          z.describe('Team display name.')
        ),
        score: example(z.int(), 13370).check(z.describe('Total team score.')),
      })
    ),
  }),
})
