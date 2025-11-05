import {
  GetChallengeSolvesRoute,
  GetChallengesRoute,
  SubmitFlagRoute,
} from '@rctf/types'

import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

group.declareRouter(GetChallengesRoute, async ({ res }) => {
  return res.goodChallenges([
    {
      id: 'chal-1',
      name: 'Warmup',
      description: 'test test',
      category: 'misc',
      author: 'es3n1n',
      files: [
        {
          name: 'challenge.txt',
          url: 'https://google.com',
        },
      ],
      points: 100,
      solves: 7,
      sortWeight: 0,
    },
  ])
})

group.declareRouter(SubmitFlagRoute, async ({ res }) => {
  return res.goodFlag()
})

group.declareRouter(GetChallengeSolvesRoute, async ({ res }) => {
  return res.goodChallengeSolves({
    solves: [
      {
        id: 'solve-1',
        createdAt: 1_700_000_000,
        userId: 'user-1',
        userName: 'es3n1n',
      },
    ],
  })
})
