import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBotJobSubmitted = response('goodAdminBotJobSubmitted', {
  status: 200,
  message: 'The admin bot job was submitted successfully.',
  data: z.object({
    jobId: example(z.string(), 'job-1a2b3c').check(
      z.describe('ID of the newly submitted job.')
    ),
  }),
})
