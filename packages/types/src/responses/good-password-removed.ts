import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodPasswordRemoved = response('goodPasswordRemoved', {
  status: 200,
  message: 'The password was successfully removed.',
  data: z.object({
    authToken: example(z.string(), '<auth-token>').check(
      z.describe(
        'Replacement bearer token. Removing a password revokes every token issued earlier, including the one used to make this request.'
      )
    ),
  }),
})
