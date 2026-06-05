import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodChallengeSolvesV2 = response('goodChallengeSolvesV2', {
  status: 200,
  message: 'The challenges solves have been retrieved.',
  data: z.object({
    solves: z.array(
      z.object({
        id: example(z.string(), 'solve-a1b2c3').check(z.describe('Solve ID.')),
        createdAt: example(z.int(), 1710000000000).check(
          z.describe('Unix timestamp in milliseconds.')
        ),
        userId: example(z.string(), 'team-xyz').check(z.describe('Team ID.')),
        userName: example(z.string(), 'otter-sec').check(
          z.describe('Team display name.')
        ),
        userAvatarUrl: z
          .nullable(example(z.string(), 'https://cdn.example.com/avatar.png'))
          .check(z.describe('Avatar URL when set.')),
        userCountryCode: z
          .nullable(example(z.string(), 'US'))
          .check(z.describe('ISO country code when set.')),
        userStatusText: z
          .nullable(example(z.string(), 'ATB'))
          .check(z.describe('Status text when set.')),
        globalPlace: example(z.int(), 3).check(
          z.describe("Team's current global standing at solve time.")
        ),
        division: example(z.string(), 'open').check(
          z.describe('Team division at solve time.')
        ),
        divisionPlace: example(z.int(), 1).check(
          z.describe("Team's current divisional standing at solve time.")
        ),
        bloodIndex: z
          .nullable(example(z.int(), 0))
          .check(
            z.describe(
              '`0`, `1`, or `2` for the first three solves. Otherwise `null{:ts}`.'
            )
          ),
      })
    ),
    mySolvePosition: z
      .nullable(example(z.int(), 12))
      .check(
        z.describe(
          "Authenticated user's solve position. Present when optional auth is sent."
        )
      ),
  }),
})
