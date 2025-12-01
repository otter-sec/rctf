import {
  GoodAdminChallenge,
  GoodAdminChallenges,
  GoodChallenges,
  GoodClientConfig,
  GoodFilesUpload,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodUserDataV2,
  GoodUserSelfDataV2,
} from '@rctf/types'
import type { ResponseData } from '@rctf/types'

export type AdminChallenge = ResponseData<typeof GoodAdminChallenges>[number]
export type AdminChallengeDetail = ResponseData<typeof GoodAdminChallenge>
export type Challenge = ResponseData<typeof GoodChallenges>[number]
export type ClientConfig = ResponseData<typeof GoodClientConfig>
export type GraphPoint = LeaderboardGraphEntry['points'][number]
export type LeaderboardData = ResponseData<typeof GoodLeaderboardV2>
export type LeaderboardEntry = LeaderboardData['leaderboard'][number]
export type LeaderboardGraphData = ResponseData<typeof GoodLeaderboardGraph>
export type LeaderboardGraphEntry = LeaderboardGraphData['graph'][number]
export type PublicUserProfile = ResponseData<typeof GoodUserDataV2>
export type Solve = UserProfile['solves'][number]
export type Sponsor = ClientConfig['sponsors'][number]
export type UploadedFile = ResponseData<typeof GoodFilesUpload>[number]
export type UserProfile = ResponseData<typeof GoodUserSelfDataV2>
