import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminUserVerificationCompleteV2 = response(
  'goodAdminUserVerificationComplete',
  {
    status: 200,
    message: 'The pending user verification was completed.',
    data: z.object({
      userId: z.string(),
    }),
  }
)
