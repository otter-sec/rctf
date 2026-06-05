import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'
import { ChallengeScoringKind } from '../util/schemas'

export const GoodLeaderboardChallengesV2 = response(
  'goodLeaderboardChallengesV2',
  {
    status: 200,
    message: 'The leaderboard challenges were retrieved.',
    data: z.object({
      challenges: example(
        z.record(
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
        {
          'challenge-id': {
            name: 'web demo',
            category: 'web',
            solves: 12,
            points: 443,
            sortWeight: null,
            scoringKind: 'decay',
            firstSolvers: [{ id: 'team-id' }],
          },
        }
      ),
    }),
  }
)
