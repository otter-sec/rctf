import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodUserUpdateV2 = response('goodUserUpdate', {
  status: 200,
  message: 'Your account was successfully updated.',
  data: z.object({
    user: z.object({
      name: z.string(),
      email: z.nullable(z.string()),
      division: z.string(),
      avatarUrl: z.nullable(z.string()),
      countryCode: z.nullable(z.string()),
      statusText: z.nullable(z.string()),
    }),
  }),
})
