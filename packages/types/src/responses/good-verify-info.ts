import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodVerifyInfo = response('goodVerifyInfo', {
  status: 200,
  message: 'The verification info was retrieved.',
  data: z.object({
    kind: z.union([
      z.literal('register'),
      z.literal('team'),
      z.literal('update'),
    ]),
    email: z.nullable(example(z.string(), 'team@example.com')),
    name: z.optional(example(z.string(), 'otter-sec')),
  }),
})
