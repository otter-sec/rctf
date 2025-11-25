import {
  GoodChallenges,
  GoodClientConfig,
  GoodLeaderboard,
  GoodLeaderboardGraph,
  GoodUserSelfData,
} from '@rctf/types'
import type { ResponseData } from '@rctf/types'

export type Challenge = ResponseData<typeof GoodChallenges>[number]
export type LeaderboardData = ResponseData<typeof GoodLeaderboard>
export type LeaderboardEntry = LeaderboardData['leaderboard'][number]
export type LeaderboardGraphData = ResponseData<typeof GoodLeaderboardGraph>
export type LeaderboardGraphEntry = LeaderboardGraphData['graph'][number]
export type GraphPoint = LeaderboardGraphEntry['points'][number]
export type UserProfile = ResponseData<typeof GoodUserSelfData>
export type Solve = UserProfile['solves'][number]
export type ClientConfig = ResponseData<typeof GoodClientConfig>
export type Sponsor = ClientConfig['sponsors'][number]
