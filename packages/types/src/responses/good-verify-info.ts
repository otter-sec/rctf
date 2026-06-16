import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodVerifyInfo = response('goodVerifyInfo', {
  status: 200,
  message: 'The verification info was retrieved.',
  data: z.object({
    kind: z
      .union([z.literal('register'), z.literal('team'), z.literal('update')])
      .check(z.describe('What completing this verification will do.')),
    email: z
      .nullable(example(z.string(), 'team@example.com'))
      .check(
        z.describe('Email tied to the verification, or `null` when absent.')
      ),
    name: z
      .optional(example(z.string(), 'otter-sec'))
      .check(z.describe('Team name tied to the verification, when present.')),
  }),
})
