import { z } from 'zod/mini'
import { response } from '../internal'
import {
  AdminBotConfigSchema,
  ChallengeFileSchemaV2,
  ChallengePointsSchema,
  ChallengeScoringSchema,
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
  sortWeight: z.nullish(z.number()),
  tags: z.nullish(z.array(z.string())),
  instancerConfig: z.nullish(InstancerConfigSchema),
  adminBotConfig: z.nullish(AdminBotConfigSchema),
  hidden: z.boolean(),
  releaseTime: z.nullish(z.number()),
  scoring: z.nullish(ChallengeScoringSchema),
  // only the single-challenge detail endpoint populates this
  solveCount: z.optional(z.int()),
})

export const GoodAdminChallengeV2 = response('goodAdminChallengeV2', {
  status: 200,
  message: 'The retrieval of the challenge as admin was successful.',
  data: AdminChallengeSchemaV2,
})
