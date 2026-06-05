import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodUploadsQueryV2 = response('goodUploadsQueryV2', {
  status: 200,
  message: 'The status of uploads was successfully queried.',
  data: z.array(
    z.object({
      sha256: z.string(),
      name: z.string(),
      url: z.nullable(z.string()),
      size: z.nullable(z.number()),
    })
  ),
})
