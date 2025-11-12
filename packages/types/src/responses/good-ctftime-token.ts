import { z } from 'zod'
import { response } from '../internal'
import { NumericString } from '../util'

export const GoodCtftimeToken = response('goodCtftimeToken', {
  status: 200,
  message: 'The CTFtime token was created.',
  data: z.object({
    ctftimeToken: z.string(),
    ctftimeName: z.string(),
    ctftimeId: NumericString,
  }),
})
