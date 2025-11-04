import { z } from 'zod'

import { response } from '../dsl'

export const GoodRegister = response('goodRegister', {
  status: 200,
  message: 'The user was created.',
  data: z.object({
    authToken: z.string(),
  }),
})
