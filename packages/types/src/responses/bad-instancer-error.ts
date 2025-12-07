import { z } from 'zod/mini'
import { response } from '../internal'

export const BadInstancerError = response('badInstancerError', {
  status: 400,
  message: 'Instancer has returned an error.',
  data: z.object({
    message: z.string(),
  }),
})
