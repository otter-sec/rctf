import { GetLeaderboardGraphRoute } from '@rctf/types'
import leaderboardGroup from '../group'

leaderboardGroup.route(GetLeaderboardGraphRoute, async ({ res }) => {
  return res.goodLeaderboardGraph({
    graph: [
      {
        id: 'team-1',
        name: 'Example Team',
        points: [
          { time: 1_700_000_000, score: 0 },
          { time: 1_700_003_600, score: 1_000 },
          { time: 1_700_007_200, score: 4_200 },
        ],
      },
      {
        id: 'team-2',
        name: 'Second Team',
        points: [
          { time: 1_700_000_000, score: 0 },
          { time: 1_700_003_600, score: 800 },
          { time: 1_700_007_200, score: 3_200 },
        ],
      },
    ],
  })
})
