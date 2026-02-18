import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminBotJobSubmitted = response('goodAdminBotJobSubmitted', {
  status: 200,
  message: 'The admin bot job was submitted successfully.',
  data: z.object({
    jobId: z.string(),
  }),
})
