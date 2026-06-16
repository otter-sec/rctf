import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

const SolveSchema = z.object({
  category: example(z.string(), 'rev').check(z.describe('Challenge category.')),
  name: example(z.string(), 'baby-rev').check(z.describe('Challenge name.')),
  points: example(z.nullable(z.int()), 487).check(
    z.describe('Challenge point value, or `null` when unavailable.')
  ),
  awardedPoints: example(z.nullable(z.int()), 487).check(
    z.describe('Points awarded to the team for this solve, or `null`.')
  ),
  solves: example(z.nullable(z.int()), 12).check(
    z.describe('Total solve count for the challenge, or `null`.')
  ),
  id: example(z.string(), 'baby-rev').check(z.describe('Challenge ID.')),
  createdAt: example(z.int(), 1710000000000).check(
    z.describe('Solve time as a Unix timestamp in milliseconds.')
  ),
  bloodIndex: example(z.nullable(z.int()), 0).check(
    z.describe('Zero-based solve order (0 = first blood), or `null`.')
  ),
})

const DynamicScoreSchema = z.object({
  id: example(z.string(), 'baby-rev').check(
    z.describe('Dynamic challenge ID.')
  ),
  points: example(z.int(), 487).check(
    z.describe("The team's current points for this challenge.")
  ),
  pointDelta: example(z.int(), -13).check(
    z.describe("The team's point change from the latest scoring tick.")
  ),
})

export const GoodUserSelfDataV2 = response('goodUserSelfDataV2', {
  status: 200,
  message: "The user's own data was successfully retrieved.",
  data: z.object({
    id: example(z.string(), 'team-1a2b3c').check(z.describe('Team ID.')),
    name: example(z.string(), 'otter-sec').check(
      z.describe('Team display name.')
    ),
    email: example(z.nullable(z.string()), 'team@osec.io').check(
      z.describe('Account email address, or `null` when unset.')
    ),
    ctftimeId: example(z.nullish(z.string()), '123456').check(
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
    dynamicScores: z.array(DynamicScoreSchema),
    teamToken: example(z.string(), '<team-token>').check(
      z.describe('Token used to invite teammates to the team.')
    ),
    allowedDivisions: example(z.array(z.string()), ['open']).check(
      z.describe('Divisions the team is allowed to switch to.')
    ),
    perms: example(z.nullable(z.int()), null).check(
      z.describe('Permission bitmask, or `null` for a standard user.')
    ),
    avatarUrl: example(
      z.nullable(z.string()),
      'https://rctf.osec.io/uploads/avatar.png'
    ).check(z.describe('Team avatar URL, or `null` when unset.')),
    countryCode: example(z.nullable(z.string()), 'US').check(
      z.describe('ISO 3166-1 alpha-2 country code, or `null` when unset.')
    ),
    statusText: example(z.nullable(z.string()), 'Qualified').check(
      z.describe('Free-form team status badge, or `null` when unset.')
    ),
  }),
})
