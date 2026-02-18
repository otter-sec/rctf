import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminBotJobLogs = response('goodAdminBotJobLogs', {
  status: 200,
  message: 'The admin bot job logs were retrieved successfully.',
  data: z.object({
    logs: z.nullable(z.string()),
  }),
})
