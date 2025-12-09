import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodLogin = response('goodLogin', {
  status: 200,
  message: 'The login was successful.',
  data: z.object({
    authToken: z.string(),
  }),
})
