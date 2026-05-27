import { z } from 'zod/mini'
import { response } from '../internal'
import { ChallengeScoringKind } from '../util/schemas'

export const GoodLeaderboardChallengesV2 = response(
  'goodLeaderboardChallenges',
  {
    status: 200,
    message: 'The leaderboard challenges were retrieved.',
    data: z.object({
      challenges: z.record(
        z.string(), // challenge id
        z.object({
          name: z.string(),
          category: z.string(),
          solves: z.int(),
          points: z.int(),
          sortWeight: z.nullable(z.int()),
          scoringKind: z.enum(ChallengeScoringKind),
          firstSolvers: z.array(
            z.object({
              id: z.string(),
            })
          ),
        })
      ),
    }),
  }
)
