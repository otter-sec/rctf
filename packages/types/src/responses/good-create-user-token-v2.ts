import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodCreateUserTokenV2 = response('goodCreateUserTokenV2', {
  status: 200,
  message: 'The creation of user token was successful.',
  data: z.object({
    token: example(z.string(), '<user-token>').check(
      z.describe('Newly created user API token.')
    ),
  }),
})
