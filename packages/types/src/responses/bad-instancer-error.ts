import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const BadInstancerError = response('badInstancerError', {
  status: 400,
  message: 'Instancer has returned an error.',
  data: z.object({
    message: example(z.string(), 'Instancer request timed out.').check(
      z.describe('Error message returned by the instancer.')
    ),
  }),
})
