import { createModules } from '../../lib/route-module'
import adminGroup from './admin'
import challsGroup from './challs'
import leaderboardGroup from './leaderboard'
import usersGroup from './users'

export default [
  ...createModules(adminGroup),
  ...createModules(usersGroup),
  ...createModules(leaderboardGroup),
  ...createModules(challsGroup),
]
