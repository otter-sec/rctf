import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAvatarUpdated = response('goodAvatarUpdated', {
  status: 200,
  message: 'The avatar was successfully updated.',
  data: z.object({
    url: example(
      z.nullable(z.string()),
      'https://rctf.osec.io/uploads/avatar.png'
    ).check(z.describe('New avatar URL, or `null` when cleared.')),
  }),
})
