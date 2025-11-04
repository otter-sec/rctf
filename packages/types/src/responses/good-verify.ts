import { z } from 'zod'

import { response } from '../dsl'

export const GoodVerify = response('goodVerify', {
  status: 200,
  message: 'The email was verified.',
  data: z.object({
    authToken: z.string(),
  }),
})
