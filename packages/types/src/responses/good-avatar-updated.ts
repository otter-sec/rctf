import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAvatarUpdated = response('goodAvatarUpdated', {
  status: 200,
  message: 'The avatar was successfully updated.',
  data: z.object({
    url: z.nullable(z.string()),
  }),
})
