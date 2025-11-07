import { config } from '@rctf/config'
import {
  CtftimeCallbackRoute,
  GetClientConfigRoute,
  GetCtftimeLeaderboardRoute,
} from '@rctf/types'
import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

group.declareRouter(GetClientConfigRoute, async ({ res }) => {
  return res.goodClientConfig({
    ...config,
    emailEnabled: Boolean(config.email),
  })
})

group.declareRouter(GetCtftimeLeaderboardRoute, async ({ res }) => {
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

group.declareRouter(CtftimeCallbackRoute, async ({ res }) => {
  return res.goodCtftimeToken({
    ctftimeToken: 'ctftime-token',
    ctftimeName: 'Example Team',
    ctftimeId: '12345',
  })
})
