import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodUserUpdate = response('goodUserUpdate', {
  status: 200,
  message: 'Your account was successfully updated.',
  data: z.object({
    user: z.object({
      name: example(z.string(), 'otter-sec').check(
        z.describe('Team display name.')
      ),
      email: example(z.nullable(z.string()), 'team@osec.io').check(
        z.describe('Account email address, or `null` when unset.')
      ),
      division: example(z.string(), 'open').check(
        z.describe('Division the team competes in.')
      ),
    }),
  }),
})
