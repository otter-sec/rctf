import { z } from 'zod'
import { response } from '../internal'

export const GoodVerify = response('goodVerify', {
  status: 200,
  message: 'The email was verified.',
  data: z.object({
    authToken: z.string(),
  }),
})
