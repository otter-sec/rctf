import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminUserVerificationResendV2 = response(
  'goodAdminUserVerificationResend',
  {
    status: 200,
    message: 'The pending user verification email was resent.',
    data: z.object({
      id: z.string(),
    }),
  }
)
