import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodLeaderboardWithGraph = response('goodLeaderboardWithGraph', {
  status: 200,
  message: 'The leaderboard with graph was retrieved.',
  data: z.object({
    total: example(z.int(), 128).check(
      z.describe('Total number of ranked teams in the division.')
    ),
    leaderboard: z.array(
      z.object({
        id: example(z.string(), 'team-1a2b3c').check(z.describe('Team ID.')),
        name: example(z.string(), 'otter-sec').check(
          z.describe('Team display name.')
        ),
        score: example(z.int(), 13370).check(z.describe('Total team score.')),
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
        solves: z.array(
          z.object({
            id: example(z.string(), 'baby-rev').check(
              z.describe('Solved challenge ID.')
            ),
            solveTime: example(z.int(), 1710000000000).check(
              z.describe('Solve time as a Unix timestamp in milliseconds.')
            ),
          })
        ),
        dynamicScores: z.array(
          z.object({
            id: example(z.string(), 'baby-rev').check(
              z.describe('Dynamic challenge ID.')
            ),
            points: example(z.int(), 487).check(
              z.describe("The team's current points for this challenge.")
            ),
            pointDelta: example(z.int(), -13).check(
              z.describe(
                "The team's point change from the latest scoring tick."
              )
            ),
          })
        ),
        division: example(z.string(), 'open').check(
          z.describe('Division the team competes in.')
        ),
        divisionPlace: example(z.int(), 3).check(
          z.describe("The team's rank within its division.")
        ),
        globalPlace: example(z.nullable(z.int()), 7).check(
          z.describe(
            "The team's overall rank, or `null` when outside the ranked set."
          )
        ),
      })
    ),
    graph: z.array(
      z.object({
        points: z.array(
          z.object({
            time: example(z.int(), 1710000000000).check(
              z.describe('Sample time as a Unix timestamp in milliseconds.')
            ),
            score: example(z.int(), 1337).check(
              z.describe('Cumulative team score at this time.')
            ),
          })
        ),
        dynamicPoints: z.optional(
          z.array(
            z.object({
              time: example(z.int(), 1710000000000).check(
                z.describe('Sample time as a Unix timestamp in milliseconds.')
              ),
              score: example(z.int(), 200).check(
                z.describe('Cumulative dynamic-scoring points at this time.')
              ),
            })
          )
        ),
        id: example(z.string(), 'team-1a2b3c').check(z.describe('Team ID.')),
        name: example(z.string(), 'otter-sec').check(
          z.describe('Team display name.')
        ),
      })
    ),
  }),
})
