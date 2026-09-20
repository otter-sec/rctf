import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodPasswordSet = response('goodPasswordSet', {
  status: 200,
  message: 'The password was successfully set.',
  data: z.object({
    authToken: example(z.string(), '<auth-token>').check(
      z.describe(
        'Replacement bearer token. Setting a password revokes every token issued earlier, including the one used to make this request.'
      )
    ),
  }),
})
