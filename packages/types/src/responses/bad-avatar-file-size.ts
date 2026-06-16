import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const BadAvatarFileSize = response('badAvatarFileSize', {
  status: 400,
  message: 'The avatar file is too large.',
  data: z.object({
    maxSize: example(z.int(), 1048576).check(
      z.describe('Maximum allowed avatar size in bytes.')
    ),
  }),
})
