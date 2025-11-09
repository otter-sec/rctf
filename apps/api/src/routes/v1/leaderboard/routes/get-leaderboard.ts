import { GetLeaderboardRoute } from '@rctf/types'
import leaderboardGroup from '../group'

leaderboardGroup.route(GetLeaderboardRoute, async ({ res }) => {
  return res.goodLeaderboard({
    total: 2,
    leaderboard: [
      {
        id: 'team-1',
        name: 'Example Team',
        score: 4_200,
      },
      {
        id: 'team-2',
        name: 'Second Team',
        score: 3_200,
      },
    ],
  })
})
