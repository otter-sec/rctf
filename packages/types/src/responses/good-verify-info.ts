import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodVerifyInfo = response('goodVerifyInfo', {
  status: 200,
  message: 'The verification info was retrieved.',
  data: z.object({
    kind: z.union([
      z.literal('register'),
      z.literal('recover'),
      z.literal('update'),
    ]),
    email: z.string(),
    name: z.optional(z.string()),
  }),
})
