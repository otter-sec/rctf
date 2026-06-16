import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodInstancerActionResult = response('goodInstancerActionResult', {
  status: 200,
  message: 'The instancer action completed.',
  data: z.object({
    message: example(z.nullable(z.string()), 'Instance restarted.').check(
      z.describe('Human-readable result message, or `null`.')
    ),
    submitFlag: example(z.nullable(z.string()), null).check(
      z.describe('Flag to submit when the action returns one, or `null`.')
    ),
  }),
})
