import { z } from 'zod/mini'
import { response } from '../internal'
import {
  AdminBotConfigSchema,
  ChallengeFileSchemaV2,
  ChallengePointsSchema,
  ChallengeScoringSchema,
  FlagEntrySchema,
  InstancerConfigSchema,
} from '../util'
import { example } from '../util/example'

export const AdminChallengeSchemaV2 = z.object({
  id: example(z.string(), 'baby-rev').check(z.describe('Challenge ID.')),
  name: example(z.string(), 'baby-rev').check(z.describe('Challenge name.')),
  description: example(z.string(), 'A gentle introduction to reversing.').check(
    z.describe('Challenge description in Markdown.')
  ),
  category: example(z.string(), 'rev').check(z.describe('Challenge category.')),
  author: example(z.string(), 'es3n1n').check(z.describe('Challenge author.')),
  files: z.array(ChallengeFileSchemaV2),
  points: ChallengePointsSchema,
  flags: example(z.array(FlagEntrySchema), [
    { provider: 'flags/static', config: { flag: 'rctf{baby_rev}' } },
  ]).check(
    z.describe(
      'Flag entries; a submission solves the challenge when any entry validates.'
    )
  ),
  tiebreakEligible: example(z.boolean(), true).check(
    z.describe('Whether solves count toward tiebreak ordering.')
  ),
  sortWeight: example(z.nullish(z.number()), null).check(
    z.describe('Manual ordering weight, or `null` when unset.')
  ),
  tags: example(z.nullish(z.array(z.string())), ['beginner']).check(
    z.describe('Challenge tags, or `null` when unset.')
  ),
  instancerConfig: z
    .nullish(InstancerConfigSchema)
    .check(
      z.describe(
        'On-demand instancer (deployment) configuration, or `null` when the challenge has none.'
      )
    ),
  adminBotConfig: z
    .nullish(AdminBotConfigSchema)
    .check(
      z.describe(
        'Admin-bot configuration, or `null` when the challenge has no admin bot.'
      )
    ),
  hidden: example(z.boolean(), false).check(
    z.describe('Whether the challenge is hidden from players.')
  ),
  releaseTime: example(z.nullish(z.number()), null).check(
    z.describe(
      'Scheduled release time as a Unix timestamp in milliseconds, or `null`.'
    )
  ),
  scoring: z
    .nullish(ChallengeScoringSchema)
    .check(
      z.describe(
        'Scoring algorithm configuration, or `null` for the CTF default.'
      )
    ),
  solveCount: example(z.optional(z.int()), 12).check(
    z.describe('Total solves; only present on the single-challenge endpoint.')
  ),
})

export const GoodAdminChallengeV2 = response('goodAdminChallengeV2', {
  status: 200,
  message: 'The retrieval of the challenge as admin was successful.',
  data: AdminChallengeSchemaV2,
})
