import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBotJobLogs = response('goodAdminBotJobLogs', {
  status: 200,
  message: 'The admin bot job logs were retrieved successfully.',
  data: z.object({
    logs: example(z.nullable(z.string()), 'Visiting target...').check(
      z.describe('Captured job logs, or `null` when none.')
    ),
  }),
})
