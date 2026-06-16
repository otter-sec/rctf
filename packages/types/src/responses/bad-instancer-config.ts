import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const BadInstancerConfig = response('badInstancerConfig', {
  status: 400,
  message: 'Invalid instancer configuration.',
  data: z.object({
    error: example(z.string(), 'Missing expose configuration.').check(
      z.describe('Human-readable validation error.')
    ),
  }),
})
