import { z } from 'zod'
import { response } from '../internal'

export const GoodAvatarUpdated = response('goodAvatarUpdated', {
  status: 200,
  message: 'The avatar was successfully updated.',
  data: z.object({
    url: z.string().nullable(),
  }),
})
