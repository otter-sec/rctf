import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const BadInstancerState = response('badInstancerState', {
  status: 400,
  message: 'Instancer precondition not met.',
  data: z.object({
    error: example(z.string(), 'Instance already running.').check(
      z.describe('Human-readable precondition failure.')
    ),
  }),
})
