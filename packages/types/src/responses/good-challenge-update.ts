import { z } from 'zod/mini'
import { response } from '../internal'
import {
  ChallengeFileSchemaV1,
  ChallengePointsSchemaV1,
  omitWhenNull,
} from '../util'
import { example } from '../util/example'

const AdminChallengeSchemaV1 = z.object({
  id: example(z.string(), 'baby-rev').check(z.describe('Challenge ID.')),
  name: example(z.string(), 'baby-rev').check(z.describe('Challenge name.')),
  description: example(z.string(), 'A gentle introduction to reversing.').check(
    z.describe('Challenge description in Markdown.')
  ),
  category: example(z.string(), 'rev').check(z.describe('Challenge category.')),
  author: example(z.string(), 'es3n1n').check(z.describe('Challenge author.')),
  files: z.array(ChallengeFileSchemaV1),
  points: ChallengePointsSchemaV1,
  flag: example(z.string(), 'rctf{baby_rev}').check(
    z.describe('The challenge flag.')
  ),
  tiebreakEligible: example(z.boolean(), true).check(
    z.describe('Whether solves count toward tiebreak ordering.')
  ),
  sortWeight: omitWhenNull(z.number()).check(
    z.describe('Manual ordering weight, or `null` when unset.')
  ),
})

export const GoodChallengeUpdate = response('goodChallengeUpdate', {
  status: 200,
  message: 'Challenge successfully updated.',
  data: AdminChallengeSchemaV1,
})
