import { z } from 'zod/mini'
import { response } from '../internal'
import { AdminBotJobStatus } from '../util'

export const GoodAdminBotJobHistory = response('goodAdminBotJobHistory', {
  status: 200,
  message: 'The admin bot job history was retrieved successfully.',
  data: z.object({
    jobs: z.array(
      z.object({
        id: z.string(),
        status: z.enum(AdminBotJobStatus),
        createdAt: z.string(),
        hasLogs: z.boolean(),
      })
    ),
  }),
})
