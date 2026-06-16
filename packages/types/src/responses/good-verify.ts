import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodVerify = response('goodVerify', {
  status: 200,
  message: 'The email was verified.',
  data: z.object({
    authToken: example(z.string(), '<auth-token>').check(
      z.describe('Bearer token authenticating the verified session.')
    ),
  }),
})
