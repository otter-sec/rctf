import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodRegister = response('goodRegister', {
  status: 200,
  message: 'The user was created.',
  data: z.object({
    authToken: example(z.string(), '<auth-token>'),
  }),
})
