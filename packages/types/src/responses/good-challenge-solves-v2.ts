import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodChallengeSolvesV2 = response('goodChallengeSolves', {
  status: 200,
  message: 'The challenges solves have been retrieved.',
  data: z.object({
    solves: z.array(
      z.object({
        id: z.string(),
        createdAt: z.int(),
        userId: z.string(),
        userName: z.string(),
        userAvatarUrl: z.nullable(z.string()),
        userCountryCode: z.nullable(z.string()),
        userStatusText: z.nullable(z.string()),
        globalPlace: z.int(),
        division: z.string(),
        divisionPlace: z.int(),
      })
    ),
    mySolvePosition: z.nullable(z.int()),
  }),
})
