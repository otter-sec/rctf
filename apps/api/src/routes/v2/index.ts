import { createModules } from '../../lib/route-module'
import adminGroup from './admin'
import challsGroup from './challs'
import integrationsGroup from './integrations'
import leaderboardGroup from './leaderboard'
import usersGroup from './users'

export default [
  ...createModules(adminGroup),
  ...createModules(usersGroup),
  ...createModules(leaderboardGroup),
  ...createModules(challsGroup),
  ...createModules(integrationsGroup),
]
