import { z } from 'zod/mini'
import { response } from '../internal'
import { AdminChallengeSchema } from './good-admin-challenge'

export const GoodAdminChallenges = response('goodAdminChallenges', {
  status: 200,
  message: 'The retrieval of challenges as admin was successful.',
  data: z.array(AdminChallengeSchema),
})
