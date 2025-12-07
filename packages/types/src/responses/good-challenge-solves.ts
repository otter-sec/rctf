import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodChallengeSolves = response('goodChallengeSolves', {
  status: 200,
  message: 'The challenges solves have been retreived.',
  data: z.object({
    solves: z.array(
      z.object({
        id: z.string(),
        createdAt: z.int(),
        userId: z.string(),
        userName: z.string(),
      })
    ),
  }),
})
