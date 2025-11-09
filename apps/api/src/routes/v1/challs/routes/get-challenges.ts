import { GetChallengesRoute } from '@rctf/types'
import challsGroup from '../group'

challsGroup.route(GetChallengesRoute, async ({ res }) => {
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
