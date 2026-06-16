import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminUserVerificationResendV2 = response(
  'goodAdminUserVerificationResendV2',
  {
    status: 200,
    message: 'The pending user verification email was resent.',
    data: z.object({
      id: example(z.string(), 'verif-1a2b3c').check(
        z.describe('ID of the pending verification.')
      ),
    }),
  }
)
