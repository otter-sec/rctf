import { z } from 'zod'

import { response } from '../dsl'

export const GoodUploadsQuery = response('goodUploadsQuery', {
  status: 200,
  message: 'The status of uploads was successfully queried.',
  data: z.array(
    z.object({
      sha256: z.string(),
      name: z.string(),
      url: z.string().nullable(),
    })
  ),
})
