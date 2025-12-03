import { z } from 'zod'
import { response } from '../internal'

export const GoodChallengesV2 = response('goodChallenges', {
  status: 200,
  message: 'The retrieval of challenges was successful.',
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      category: z.string(),
      author: z.string(),
      files: z.array(
        z.object({
          name: z.string(),
          url: z.string(),
          size: z.number().int().nullable(),
        })
      ),
      points: z.number().int(),
      solves: z.number().int(),
      sortWeight: z.number().nullable(),
      instancer: z.boolean(),
    })
  ),
})
