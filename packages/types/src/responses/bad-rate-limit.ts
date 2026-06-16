import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const BadRateLimit = response('badRateLimit', {
  status: 429,
  message: 'You are trying this too fast.',
  data: z.object({
    timeLeft: example(z.int(), 600000).check(
      z.describe('Time until the next attempt is allowed, in milliseconds.')
    ),
  }),
})
