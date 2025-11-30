import { z } from 'zod'
import { response } from '../internal'

export const BadAvatarFileSize = response('badAvatarFileSize', {
  status: 400,
  message: 'The avatar file is too large.',
  data: z.object({
    maxSize: z.number(),
  }),
})
