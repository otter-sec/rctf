import { createModules } from '../../lib/route-module'
import adminGroup from './admin'
import authGroup from './auth'
import challsGroup from './challs'
import extAuthGroup from './ext-auth'
import integrationsGroup from './integrations'
import leaderboardGroup from './leaderboard'
import usersGroup from './users'

export default [
  ...createModules(adminGroup),
  ...createModules(authGroup),
  ...createModules(usersGroup),
  ...createModules(leaderboardGroup),
  ...createModules(challsGroup),
  ...createModules(integrationsGroup),
  ...createModules(extAuthGroup),
]
