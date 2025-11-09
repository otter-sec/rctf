import { GetAdminChallengesRoute } from '@rctf/types'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengesRoute, async ({ res }) => {
  return res.goodAdminChallenges([
    {
      id: 'chal-1',
      name: 'Warmup',
      description: 'Test description',
      category: 'misc',
      author: 'es3n1n',
      files: [
        {
          name: 'challenge.txt',
          url: 'https://google.com/',
        },
      ],
      points: { min: 100, max: 500 },
      flag: 'rctf{example}',
      tiebreakEligible: true,
      sortWeight: 0,
    },
  ])
})
