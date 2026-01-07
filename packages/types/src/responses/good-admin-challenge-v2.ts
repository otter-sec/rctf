import { z } from 'zod/mini'
import { response } from '../internal'
import {
  ChallengeFileSchemaV2,
  ChallengePointsSchema,
  InstancerConfigSchema,
} from '../util'

export const AdminChallengeSchemaV2 = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  author: z.string(),
  files: z.array(ChallengeFileSchemaV2),
  points: ChallengePointsSchema,
  flag: z.string(),
  tiebreakEligible: z.boolean(),
  sortWeight: z.nullable(z.number()),
  instancerConfig: z.nullable(InstancerConfigSchema),
  hidden: z.boolean(),
})

export const GoodAdminChallengeV2 = response('goodAdminChallenge', {
  status: 200,
  message: 'The retrieval of the challenge as admin was successful.',
  data: AdminChallengeSchemaV2,
})
