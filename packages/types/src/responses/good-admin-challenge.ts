import { z } from 'zod'

import { response } from '../dsl'

const ChallengeFileSchema = z.object({
  name: z.string(),
  url: z.string(),
})

const ChallengePointsSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
})

const AdminChallengeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  author: z.string(),
  files: z.array(ChallengeFileSchema),
  points: ChallengePointsSchema,
  flag: z.string(),
  tiebreakEligible: z.boolean(),
  sortWeight: z.number().optional(),
})

export const GoodAdminChallenge = response('goodAdminChallenge', {
  status: 200,
  message: 'The retrieval of the challenge as admin was successful.',
  data: AdminChallengeSchema,
})
