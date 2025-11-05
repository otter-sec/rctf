import { createModules } from '../../lib/route-module'

import adminGroup from './admin'
import authGroup from './auth'
import challsGroup from './challs'
import integrationsGroup from './integrations'
import leaderboardGroup from './leaderboard'
import usersGroup from './users'

export default [
  ...createModules(adminGroup),
  ...createModules(authGroup),
  ...createModules(challsGroup),
  ...createModules(integrationsGroup),
  ...createModules(leaderboardGroup),
  ...createModules(usersGroup),
]
