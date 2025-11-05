import { z } from 'zod'
import { response } from '../internal'

export const GoodChallengeSolves = response('goodChallengeSolves', {
  status: 200,
  message: 'The challenges solves have been retreived.',
  data: z.object({
    solves: z.array(
      z.object({
        id: z.string(),
        createdAt: z.number().int(),
        userId: z.string(),
        userName: z.string(),
      })
    ),
  }),
})
