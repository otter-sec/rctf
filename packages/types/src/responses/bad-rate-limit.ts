import { z } from 'zod/mini'
import { response } from '../internal'

export const BadRateLimit = response('badRateLimit', {
  status: 429,
  message: 'You are trying this too fast.',
  data: z.object({
    timeLeft: z.int(),
  }),
})
