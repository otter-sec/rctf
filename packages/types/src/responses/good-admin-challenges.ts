import { z } from 'zod'

import { response } from '../internal'

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

export const GoodAdminChallenges = response('goodAdminChallenges', {
  status: 200,
  message: 'The retrieval of challenges as admin was successful.',
  data: z.array(AdminChallengeSchema),
})
