import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodInstancerActionResult = response('goodInstancerActionResult', {
  status: 200,
  message: 'The instancer action completed.',
  data: z.object({
    message: z.nullable(z.string()),
    submitFlag: z.nullable(z.string()),
  }),
})
