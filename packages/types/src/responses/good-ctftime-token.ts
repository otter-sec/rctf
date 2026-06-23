import { z } from 'zod/mini'
import { response } from '../internal'
import { NumericString } from '../util'
import { example } from '../util/example'

export const GoodCtftimeToken = response('goodCtftimeToken', {
  status: 200,
  message: 'The CTFtime token was created.',
  data: z.object({
    ctftimeToken: example(z.string(), '<ctftime-token>').check(
      z.describe('Opaque token linking the rCTF account to CTFtime.')
    ),
    ctftimeName: example(z.string(), 'otter-sec').check(
      z.describe('CTFtime team name.')
    ),
    ctftimeId: example(NumericString, '123456').check(
      z.describe('CTFtime team ID.')
    ),
  }),
})
