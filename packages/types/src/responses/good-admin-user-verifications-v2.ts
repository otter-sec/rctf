import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

const AdminUserVerification = z.object({
  id: example(z.string(), 'verif-1a2b3c').check(
    z.describe('Pending verification ID.')
  ),
  name: example(z.string(), 'otter-sec').check(z.describe('Team name.')),
  email: example(z.string(), 'team@osec.io').check(z.describe('Team email.')),
  division: example(z.string(), 'open').check(z.describe("Team's division.")),
  createdAt: example(z.int(), 1710000000000).check(
    z.describe('Creation time as a Unix timestamp in milliseconds.')
  ),
  expiresAt: example(z.int(), 1710003600000).check(
    z.describe('Expiry time as a Unix timestamp in milliseconds.')
  ),
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
