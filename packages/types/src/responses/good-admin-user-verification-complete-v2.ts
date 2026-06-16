import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminUserVerificationCompleteV2 = response(
  'goodAdminUserVerificationCompleteV2',
  {
    status: 200,
    message: 'The pending user verification was completed.',
    data: z.object({
      userId: example(z.string(), 'team-1a2b3c').check(
        z.describe('ID of the verified team.')
      ),
    }),
  }
)
