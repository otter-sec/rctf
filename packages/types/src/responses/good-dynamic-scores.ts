import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodDynamicScores = response('goodDynamicScores', {
  status: 200,
  message: 'Scores accepted.',
  data: z.object({
    inserted: example(z.int(), 5).check(
      z.describe('Number of new dynamic scores inserted.')
    ),
    updated: example(z.int(), 2).check(
      z.describe('Number of existing dynamic scores updated.')
    ),
    deleted: example(z.int(), 0).check(
      z.describe('Number of dynamic scores removed.')
    ),
  }),
})
