import { z } from 'zod/mini'
import { response } from '../internal'
import {
  ChallengeFileSchemaV1,
  ChallengePointsSchemaV1,
  omitWhenNull,
} from '../util'

export const AdminChallengeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  author: z.string(),
  files: z.array(ChallengeFileSchemaV1),
  points: ChallengePointsSchemaV1,
  flag: z.string(),
  tiebreakEligible: z.boolean(),
  sortWeight: omitWhenNull(z.number()),
})

export const GoodAdminChallenge = response('goodAdminChallenge', {
  status: 200,
  message: 'The retrieval of the challenge as admin was successful.',
  data: AdminChallengeSchema,
})
