import {
  CtftimeCallbackRoute,
  GetClientConfigRoute,
  GetCtftimeLeaderboardRoute,
} from '@rctf/types'

import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

const exampleClientConfig = {
  meta: {
    description: 'Example rCTF instance',
    imageUrl: 'https://example.com/logo.png',
  },
  homeContent: '# Development instance',
  sponsors: [
    {
      name: 'Example Sponsor',
      icon: 'https://example.com/sponsor.png',
      description: 'Supporting the event in development mode.',
      small: false,
    },
  ],
  globalSiteTag: 'G-EXAMPLE',
  ctfName: 'rCTF Dev',
  divisions: {
    open: 'Open',
  },
  defaultDivision: 'open',
  origin: 'https://rctf.local',
  startTime: 1_700_000_000,
  endTime: 9_999_999_999,
  userMembers: true,
  faviconUrl: 'https://example.com/favicon.ico',
  emailEnabled: true,
  registrationsEnabled: true,
  ctftime: {
    clientId: 'ctftime-client-id',
  },
}

group.declareRouter(GetClientConfigRoute, async ({ res }) => {
  return res.goodClientConfig(exampleClientConfig)
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
