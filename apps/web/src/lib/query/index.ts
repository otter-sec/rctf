import {
  adminBotStatusQueryOptions,
  adminChallengeQueryOptions,
  adminChallengesQueryOptions,
  adminExternalAuthClientsQueryOptions,
  adminSettingsQueryOptions,
  adminSubmissionsQueryOptions,
  adminUserQueryOptions,
  adminUserVerificationsQueryOptions,
  instancerSchemaQueryOptions,
  type AdminSubmissionsQueryParams,
} from './admin'
import {
  challengeScoresQueryOptions,
  challengeSolvesQueryOptions,
  challengesQueryOptions,
} from './challenges'
import { clientConfigQueryOptions } from './config'
import {
  leaderboardChallengesQueryOptions,
  leaderboardGraphQueryOptions,
  leaderboardQueryOptions,
  leaderboardWithGraphQueryOptions,
  selfUserGraphQueryOptions,
} from './leaderboard'
import { membersQueryOptions } from './profile'
import { userByIdQueryOptions, userSelfQueryOptions } from './user'

export * from './core'
export * from './config'
export * from './user'
export * from './auth'
export * from './challenges'
export * from './leaderboard'
export * from './admin'
export * from './profile'

export const queryKeys = {
  clientConfig: clientConfigQueryOptions.queryKey,
  userSelf: userSelfQueryOptions.queryKey,
  userById: (id: string) => userByIdQueryOptions(id).queryKey,
  challenges: challengesQueryOptions.queryKey,
  adminChallenges: adminChallengesQueryOptions.queryKey,
  adminChallenge: (id: string) => adminChallengeQueryOptions(id).queryKey,
  adminUser: (id: string) => adminUserQueryOptions(id).queryKey,
  adminUserVerifications: adminUserVerificationsQueryOptions.queryKey,
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
  challengeScores: (id: string, params: { limit: number; offset: number }) =>
    challengeScoresQueryOptions(id, params).queryKey,
  members: membersQueryOptions.queryKey,
  instancerSchema: instancerSchemaQueryOptions.queryKey,
  adminBotStatus: adminBotStatusQueryOptions.queryKey,
  adminExternalAuthClients: adminExternalAuthClientsQueryOptions.queryKey,
  adminSettings: adminSettingsQueryOptions.queryKey,
  adminSubmissions: (
    params: { limit: number; offset: number } & AdminSubmissionsQueryParams
  ) => adminSubmissionsQueryOptions(params).queryKey,
}
