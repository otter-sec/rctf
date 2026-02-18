import { z } from 'zod/mini'
import { response } from '../internal'

export const BadInstancerState = response('badInstancerState', {
  status: 400,
  message: 'Instancer precondition not met.',
  data: z.object({
    error: z.string(),
  }),
})
