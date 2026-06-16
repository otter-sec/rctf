import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodLeaderboardGraph = response('goodLeaderboardGraph', {
  status: 200,
  message: 'The leaderboard graph was retrieved.',
  data: z.object({
    graph: z.array(
      z.object({
        points: z.array(
          z.object({
            time: example(z.int(), 1710000000000).check(
              z.describe('Sample time as a Unix timestamp in milliseconds.')
            ),
            score: example(z.int(), 1337).check(
              z.describe('Cumulative team score at this time.')
            ),
          })
        ),
        dynamicPoints: z.optional(
          z.array(
            z.object({
              time: example(z.int(), 1710000000000).check(
                z.describe('Sample time as a Unix timestamp in milliseconds.')
              ),
              score: example(z.int(), 200).check(
                z.describe('Cumulative dynamic-scoring points at this time.')
              ),
            })
          )
        ),
        id: example(z.string(), 'team-1a2b3c').check(z.describe('Team ID.')),
        name: example(z.string(), 'otter-sec').check(
          z.describe('Team display name.')
        ),
      })
    ),
  }),
})
