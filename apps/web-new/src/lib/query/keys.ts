import type {
  FilterAdminSubmissionsRouteV2,
  RouteBody,
  RouteQuery,
} from '@rctf/types'

export type AdminSubmissionsQueryParams = Pick<
  RouteQuery<typeof FilterAdminSubmissionsRouteV2>,
  'sortBy' | 'sortOrder' | 'challengeSearch' | 'teamSearch'
> &
  RouteBody<typeof FilterAdminSubmissionsRouteV2>

export const queryKeys = {
  clientConfig: ['clientConfig'] as const,
  userSelf: ['user', 'self'] as const,
  verifyInfo: (token: string) => ['auth', 'verify-info', token] as const,
  userById: (id: string) => ['user', id] as const,
  challenges: ['challenges'] as const,
  adminChallenges: ['admin', 'challenges'] as const,
  adminChallenge: (id: string) => ['admin', 'challenges', id] as const,
  adminUser: (id: string) => ['admin', 'users', id] as const,
  adminUserVerifications: ['admin', 'user-verifications'] as const,
  fullLeaderboard: ['leaderboard'] as const,
  leaderboard: (params: { limit: number; offset: number; division?: string }) =>
    ['leaderboard', params] as const,
  leaderboardChallenges: ['leaderboard', 'challenges'] as const,
  leaderboardGraph: (params: {
    limit: number
    offset: number
    division?: string
  }) => ['leaderboard', 'graph', params] as const,
  leaderboardWithGraph: (params: { division?: string; search?: string }) =>
    ['leaderboard', 'with-graph', params] as const,
  selfUserGraph: (globalPlace: number | null, userId: string | null = null) =>
    ['leaderboard', 'graph', 'self', userId, globalPlace] as const,
  challengeSolves: (id: string, params: { limit: number; offset: number }) =>
    ['challenges', id, 'solves', params] as const,
  challengeScores: (id: string, params: { limit: number; offset: number }) =>
    ['challenges', id, 'scores', params] as const,
  challengeSolvesInfinite: (id: string) =>
    ['challenges', id, 'solves', 'infinite'] as const,
  challengeScoresInfinite: (id: string) =>
    ['challenges', id, 'scores', 'infinite'] as const,
  challenge: (id: string) => ['challenges', id] as const,
  challengeInstance: (id: string) => ['challenges', id, 'instance'] as const,
  challengeAdminBotStatus: (id: string) =>
    ['challenges', id, 'admin-bot', 'status'] as const,
  challengeAdminBotHistory: (id: string) =>
    ['challenges', id, 'admin-bot', 'history'] as const,
  challengeAdminBotJobLogs: (id: string, jobId: string) =>
    ['challenges', id, 'admin-bot', 'jobs', jobId, 'logs'] as const,
  members: ['members'] as const,
  instancerSchema: ['admin', 'instancer', 'schema'] as const,
  adminBotStatus: ['admin', 'admin-bot', 'status'] as const,
  adminExternalAuthClients: ['admin', 'external-auth', 'clients'] as const,
  adminSettings: ['admin', 'settings'] as const,
  adminSubmissions: (
    params: { limit: number; offset: number } & AdminSubmissionsQueryParams
  ) => ['admin', 'submissions', params] as const,
}
