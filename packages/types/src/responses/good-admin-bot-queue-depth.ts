import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBotQueueDepth = response('goodAdminBotQueueDepth', {
  status: 200,
  message: 'The admin bot queue depth was retrieved successfully.',
  data: z.object({
    depth: example(z.number(), 4).check(
      z.describe('Number of jobs currently queued.')
    ),
  }),
})
