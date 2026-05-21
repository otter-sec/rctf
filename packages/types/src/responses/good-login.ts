import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodLogin = response('goodLogin', {
  status: 200,
  message: 'The login was successful.',
  data: z.object({
    authToken: example(z.string(), '<auth-token>'),
  }),
})
