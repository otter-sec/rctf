export * from './core'
export * from './config'
export * from './user'
export * from './auth'
export * from './challenges'
export * from './leaderboard'
export * from './admin'
export * from './profile'

import { clientConfigQueryOptions } from './config'
import { userSelfQueryOptions, userByIdQueryOptions } from './user'
import {
  challengesQueryOptions,
  challengeSolvesQueryOptions,
} from './challenges'
import {
  leaderboardQueryOptions,
  leaderboardChallengesQueryOptions,
  leaderboardGraphQueryOptions,
  leaderboardWithGraphQueryOptions,
  selfUserGraphQueryOptions,
} from './leaderboard'
import {
  adminChallengesQueryOptions,
  adminChallengeQueryOptions,
  adminBotStatusQueryOptions,
  adminSettingsQueryOptions,
  instancerSchemaQueryOptions,
} from './admin'
import { membersQueryOptions } from './profile'

export const queryKeys = {
  clientConfig: clientConfigQueryOptions.queryKey,
  userSelf: userSelfQueryOptions.queryKey,
  userById: (id: string) => userByIdQueryOptions(id).queryKey,
  challenges: challengesQueryOptions.queryKey,
  adminChallenges: adminChallengesQueryOptions.queryKey,
  adminChallenge: (id: string) => adminChallengeQueryOptions(id).queryKey,
  fullLeaderboard: ['leaderboard'] as const,
  leaderboard: (params: { limit: number; offset: number; division: string }) =>
    leaderboardQueryOptions(params).queryKey,
  leaderboardChallenges: leaderboardChallengesQueryOptions.queryKey,
  leaderboardGraph: (params: {
    limit: number
    offset: number
    division: string
  }) => leaderboardGraphQueryOptions(params).queryKey,
  leaderboardWithGraph: (params: {
    limit: number
    offset: number
    division: string
  }) => leaderboardWithGraphQueryOptions(params).queryKey,
  selfUserGraph: (globalPlace: number | null) =>
    selfUserGraphQueryOptions(globalPlace).queryKey,
  challengeSolves: (id: string, params: { limit: number; offset: number }) =>
    challengeSolvesQueryOptions(id, params).queryKey,
  members: membersQueryOptions.queryKey,
  instancerSchema: instancerSchemaQueryOptions.queryKey,
  adminBotStatus: adminBotStatusQueryOptions.queryKey,
  adminSettings: adminSettingsQueryOptions.queryKey,
}
