import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const BadAdminBotConfig = response('badAdminBotConfig', {
  status: 400,
  message: 'Invalid admin bot configuration.',
  data: z.object({
    error: example(z.string(), 'Unknown admin-bot config code.').check(
      z.describe('Human-readable validation error.')
    ),
  }),
})
