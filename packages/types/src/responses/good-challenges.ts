import { z } from 'zod'

import { response } from '../dsl'

export const GoodChallenges = response('goodChallenges', {
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
        })
      ),
      points: z.number().int().optional(),
      solves: z.number().int().optional(),
      sortWeight: z.number().optional(),
    })
  ),
})
