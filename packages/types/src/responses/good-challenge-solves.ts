import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodChallengeSolves = response('goodChallengeSolves', {
  status: 200,
  message: 'The challenges solves have been retreived.',
  data: z.object({
    solves: z.array(
      z.object({
        id: example(z.string(), 'solve-a1b2c3').check(z.describe('Solve ID.')),
        createdAt: example(z.int(), 1710000000000).check(
          z.describe('Unix timestamp in milliseconds.')
        ),
        userId: example(z.string(), 'team-xyz').check(z.describe('Team ID.')),
        userName: example(z.string(), 'otter-sec').check(
          z.describe('Team display name.')
        ),
      })
    ),
  }),
})
