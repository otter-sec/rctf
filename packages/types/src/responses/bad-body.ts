import { z } from 'zod/mini'
import { response } from '../internal'

export const BadBody = response('badBody', {
  status: 400,
  message: 'The request body does not meet requirements.',
  data: z.object({
    reason: z.string(),
  }),
})
