import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminUserV2 = response('goodAdminUserV2', {
  status: 200,
  message: 'The user was retrieved.',
  data: z.object({
    id: example(z.string(), 'team-1a2b3c').check(z.describe('Team ID.')),
    name: example(z.string(), 'otter-sec').check(z.describe('Team name.')),
    email: example(z.nullable(z.string()), 'team@osec.io').check(
      z.describe('Team email, or `null` when unset.')
    ),
    division: example(z.string(), 'open').check(z.describe("Team's division.")),
    perms: example(z.int(), 0).check(z.describe('Permission bitmask.')),
    banned: example(z.boolean(), false).check(
      z.describe('Whether the team is banned.')
    ),
    score: example(z.int(), 13370).check(z.describe("Team's current score.")),
    solveCount: example(z.int(), 12).check(
      z.describe('Number of challenges solved.')
    ),
    avatarUrl: example(
      z.nullable(z.string()),
      'https://rctf.osec.io/uploads/avatar.png'
    ).check(z.describe('Avatar URL, or `null` when unset.')),
    countryCode: example(z.nullable(z.string()), 'US').check(
      z.describe('ISO 3166-1 alpha-2 country code, or `null`.')
    ),
    statusText: example(z.nullable(z.string()), 'Qualified').check(
      z.describe('Free-form status badge, or `null`.')
    ),
    createdAt: example(z.string(), '2024-03-09T00:00:00.000Z').check(
      z.describe('Account creation time as an ISO 8601 string.')
    ),
    solves: z.array(
      z.object({
        challengeId: example(z.string(), 'baby-rev').check(
          z.describe('Challenge ID.')
        ),
        challengeName: example(z.string(), 'baby-rev').check(
          z.describe('Challenge name.')
        ),
        challengeCategory: example(z.string(), 'rev').check(
          z.describe('Challenge category.')
        ),
        createdAt: example(z.string(), '2024-03-09T00:00:00.000Z').check(
          z.describe('Solve time as an ISO 8601 string.')
        ),
      })
    ),
  }),
})
