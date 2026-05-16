import { z } from 'zod/mini'
import { response } from '../internal'
import { RemoteSchema } from '../util'

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
          size: z.nullable(z.int()),
        })
      ),
      points: z.int(),
      solves: z.int(),
      sortWeight: z.nullable(z.number()),
      remotes: z.array(RemoteSchema),
      instancerLifetime: z.nullable(z.number()),
      instancerExtendable: z.boolean(),
      adminBotInputs: z.nullish(
        z.record(
          z.string(),
          z.object({ pattern: z.string(), flags: z.optional(z.string()) })
        )
      ),
      hasFlag: z.boolean(),
    })
  ),
})
