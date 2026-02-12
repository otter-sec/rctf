import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminBotJobPull = response('goodAdminBotJobPull', {
  status: 200,
  message: 'The admin bot job was pulled successfully.',
  data: z.object({
    job: z.nullable(
      z.object({
        id: z.string(),
        challengeId: z.string(),
        configRevision: z.string(),
        userId: z.string(),
        submittedAt: z.string(),
        flag: z.string(),
        inputs: z.record(z.string(), z.string()),
        instancerInstances: z.array(
          z.object({
            type: z.string(),
            host: z.string(),
            port: z.number(),
            title: z.optional(z.string()),
          })
        ),
      })
    ),
  }),
})
