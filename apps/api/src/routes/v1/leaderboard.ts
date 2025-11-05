import { GetLeaderboardGraphRoute, GetLeaderboardRoute } from '@rctf/types'
import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

group.declareRouter(GetLeaderboardRoute, async ({ res }) => {
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

group.declareRouter(GetLeaderboardGraphRoute, async ({ res }) => {
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
