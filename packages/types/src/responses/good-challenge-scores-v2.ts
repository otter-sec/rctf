import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodChallengeScoresV2 = response('goodChallengeScores', {
  status: 200,
  message: 'The challenge scores have been retrieved.',
  data: z.object({
    total: example(z.int(), 42).check(
      z.describe('Total number of ranked teams with a score on this challenge.')
    ),
    myPosition: z
      .nullable(example(z.int(), 12))
      .check(
        z.describe(
          "Authenticated user's rank on this challenge. Present when optional auth is sent and the user has a score."
        )
      ),
    scores: z.array(
      z.object({
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
        points: example(z.int(), 1280).check(
          z.describe("Team's current points on this challenge.")
        ),
        pointDelta: example(z.int(), 50).check(
          z.describe(
            "Team's latest dynamic point delta on this challenge. Signed; `0{:ts}` when the team didn't move in the most recent feed tick."
          )
        ),
        globalPlace: example(z.int(), 3).check(
          z.describe("Team's current global standing.")
        ),
        division: example(z.string(), 'open').check(
          z.describe('Team division.')
        ),
        divisionPlace: example(z.int(), 1).check(
          z.describe("Team's current divisional standing.")
        ),
      })
    ),
    graph: z.array(
      z.object({
        id: example(z.string(), 'team-xyz').check(z.describe('Team ID.')),
        name: example(z.string(), 'otter-sec').check(
          z.describe('Team display name.')
        ),
        points: z.array(
          z.object({
            time: example(z.int(), 1710000000000).check(
              z.describe('Unix timestamp in milliseconds.')
            ),
            score: example(z.int(), 1280).check(
              z.describe(
                "Team's cumulative score on this challenge at that time."
              )
            ),
          })
        ),
      })
    ),
  }),
})
