import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodUserUpdateV2 = response('goodUserUpdateV2', {
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
      avatarUrl: example(
        z.nullable(z.string()),
        'https://rctf.osec.io/uploads/avatar.png'
      ).check(z.describe('Team avatar URL, or `null` when unset.')),
      countryCode: example(z.nullable(z.string()), 'US').check(
        z.describe('ISO 3166-1 alpha-2 country code, or `null` when unset.')
      ),
      statusText: example(z.nullable(z.string()), 'Qualified').check(
        z.describe('Free-form team status badge, or `null` when unset.')
      ),
    }),
  }),
})
