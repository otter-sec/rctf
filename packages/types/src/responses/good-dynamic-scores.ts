import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodDynamicScores = response('goodDynamicScores', {
  status: 200,
  message: 'Scores accepted.',
  data: z.object({
    inserted: z.int(),
    updated: z.int(),
    deleted: z.int(),
  }),
})
