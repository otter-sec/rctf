import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodCreateUserTokenV2 = response('goodCreateUserToken', {
  status: 200,
  message: 'The creation of user token was successful.',
  data: z.object({
    token: z.string(),
  }),
})
