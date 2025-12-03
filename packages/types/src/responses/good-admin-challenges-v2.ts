import { z } from 'zod'
import { response } from '../internal'
import { AdminChallengeSchemaV2 } from './good-admin-challenge-v2'

export const GoodAdminChallengesV2 = response('goodAdminChallenges', {
  status: 200,
  message: 'The retrieval of challenges as admin was successful.',
  data: z.array(AdminChallengeSchemaV2),
})
