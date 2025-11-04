import { z } from 'zod'

import { response } from '../dsl'

export const GoodLogin = response('goodLogin', {
  status: 200,
  message: 'The login was successful.',
  data: z.object({
    authToken: z.string(),
  }),
})
