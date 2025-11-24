import {
  GoodChallenges,
  GoodClientConfig,
  GoodLeaderboard,
  GoodUserSelfData,
} from '@rctf/types'
import type { ResponseData } from '@rctf/types'

export type Challenge = ResponseData<typeof GoodChallenges>[number]
export type LeaderboardData = ResponseData<typeof GoodLeaderboard>
export type LeaderboardEntry = LeaderboardData['leaderboard'][number]
export type UserProfile = ResponseData<typeof GoodUserSelfData>
export type Solve = UserProfile['solves'][number]
export type ClientConfig = ResponseData<typeof GoodClientConfig>
export type Sponsor = ClientConfig['sponsors'][number]
