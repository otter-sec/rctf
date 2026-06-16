import { z } from 'zod/mini'
import { response } from '../internal'
import { omitWhenNull } from '../util'
import { example } from '../util/example'

const SolveSchema = z.object({
  category: example(z.string(), 'rev').check(z.describe('Challenge category.')),
  name: example(z.string(), 'baby-rev').check(z.describe('Challenge name.')),
  points: example(z.nullable(z.int()), 487).check(
    z.describe('Challenge point value, or `null` when unavailable.')
  ),
  solves: example(z.nullable(z.int()), 12).check(
    z.describe('Total solve count for the challenge, or `null`.')
  ),
  id: example(z.string(), 'baby-rev').check(z.describe('Challenge ID.')),
  createdAt: example(z.int(), 1710000000000).check(
    z.describe('Solve time as a Unix timestamp in milliseconds.')
  ),
})

export const GoodUserData = response('goodUserData', {
  status: 200,
  message: 'The user data was successfully retrieved.',
  data: z.object({
    name: example(z.string(), 'otter-sec').check(
      z.describe('Team display name.')
    ),
    ctftimeId: example(omitWhenNull(z.string()), '123456').check(
      z.describe('Linked CTFtime team ID, when present.')
    ),
    division: example(z.string(), 'open').check(
      z.describe('Division the team competes in.')
    ),
    score: example(z.int(), 13370).check(z.describe('Total team score.')),
    globalPlace: example(z.nullable(z.int()), 7).check(
      z.describe('Overall rank, or `null` when unranked.')
    ),
    divisionPlace: example(z.nullable(z.int()), 3).check(
      z.describe('Rank within the division, or `null` when unranked.')
    ),
    solves: z.array(SolveSchema),
  }),
})
