import { GetChallengeSolvesRoute } from '@rctf/types'
import challsGroup from '../group'

challsGroup.route(GetChallengeSolvesRoute, async ({ res }) => {
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
