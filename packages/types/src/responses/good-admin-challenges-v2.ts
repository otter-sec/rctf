import { z } from 'zod/mini'
import { response } from '../internal'
import { AdminChallengeSchemaV2 } from './good-admin-challenge-v2'

export const GoodAdminChallengesV2 = response('goodAdminChallengesV2', {
  status: 200,
  message: 'The retrieval of challenges as admin was successful.',
  data: z.array(AdminChallengeSchemaV2),
})
