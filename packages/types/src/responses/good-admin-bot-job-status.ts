import { z } from 'zod/mini'
import { response } from '../internal'
import { AdminBotJobStatus } from '../util'

export const GoodAdminBotJobStatus = response('goodAdminBotJobStatus', {
  status: 200,
  message: 'The admin bot job status was retrieved successfully.',
  data: z.object({
    job: z.nullable(
      z.object({
        id: z.string(),
        status: z.enum(AdminBotJobStatus),
        createdAt: z.string(),
        queuePosition: z.nullable(z.int()),
        logs: z.nullable(z.string()),
      })
    ),
  }),
})
