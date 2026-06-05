import { z } from 'zod/mini'
import { response } from '../internal'

const AdminUserVerification = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  division: z.string(),
  createdAt: z.int(),
  expiresAt: z.int(),
})

export const GoodAdminUserVerificationsV2 = response(
  'goodAdminUserVerificationsV2',
  {
    status: 200,
    message: 'The pending user verifications were retrieved.',
    data: z.object({
      verifications: z.array(AdminUserVerification),
    }),
  }
)
