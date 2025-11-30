import { createModules } from '../../lib/route-module'
import challsGroup from './challs'
import leaderboardGroup from './leaderboard'
import usersGroup from './users'

export default [
  ...createModules(usersGroup),
  ...createModules(leaderboardGroup),
  ...createModules(challsGroup),
]
