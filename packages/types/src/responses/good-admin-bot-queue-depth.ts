import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminBotQueueDepth = response('goodAdminBotQueueDepth', {
  status: 200,
  message: 'The admin bot queue depth was retrieved successfully.',
  data: z.object({
    depth: z.number(),
  }),
})
