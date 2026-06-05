import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminUserVerificationCompleteV2 = response(
  'goodAdminUserVerificationCompleteV2',
  {
    status: 200,
    message: 'The pending user verification was completed.',
    data: z.object({
      userId: z.string(),
    }),
  }
)
