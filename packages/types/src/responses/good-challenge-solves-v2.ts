import { z } from 'zod'
import { response } from '../internal'

export const GoodChallengeSolvesV2 = response('goodChallengeSolves', {
  status: 200,
  message: 'The challenges solves have been retrieved.',
  data: z.object({
    solves: z.array(
      z.object({
        id: z.string(),
        createdAt: z.number().int(),
        userId: z.string(),
        userName: z.string(),
        userAvatarUrl: z.string().nullable(),
        globalPlace: z.number().int(),
        division: z.string(),
        divisionPlace: z.number().int(),
      })
    ),
    mySolvePosition: z.number().int().nullable(),
  }),
})
