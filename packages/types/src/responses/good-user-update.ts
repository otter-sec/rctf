import { z } from 'zod'
import { response } from '../internal'

export const GoodUserUpdate = response('goodUserUpdate', {
  status: 200,
  message: 'Your account was successfully updated.',
  data: z.object({
    user: z.object({
      name: z.string(),
      email: z.string().nullable(),
      division: z.string(),
    }),
  }),
})
