import { GetCtftimeLeaderboardRoute } from '@rctf/types'
import integrationsGroup from '../group'

integrationsGroup.route(GetCtftimeLeaderboardRoute, async ({ res }) => {
  return res.goodCtftimeLeaderboard({
    standings: [
      {
        pos: 1,
        team: 'Example Team',
        score: 1_234,
      },
      {
        pos: 2,
        team: 'Second Team',
        score: 987,
      },
    ],
  })
})
