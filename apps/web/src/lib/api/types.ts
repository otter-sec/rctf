import {
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodChallengesV2,
  GoodClientConfig,
  GoodFilesUploadV2,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodUserDataV2,
  GoodUserSelfDataV2,
} from '@rctf/types'
import type { ResponseData } from '@rctf/types'

export type AdminChallenge = ResponseData<typeof GoodAdminChallengesV2>[number]
export type AdminChallengeDetail = ResponseData<typeof GoodAdminChallengeV2>
export type InstancerConfig = NonNullable<
  AdminChallengeDetail['instancerConfig']
>
export type Challenge = ResponseData<typeof GoodChallengesV2>[number]
export type ClientConfig = ResponseData<typeof GoodClientConfig>
export type GraphPoint = LeaderboardGraphEntry['points'][number]
export type LeaderboardData = ResponseData<typeof GoodLeaderboardV2>
export type LeaderboardEntry = LeaderboardData['leaderboard'][number]
export type LeaderboardGraphData = ResponseData<typeof GoodLeaderboardGraph>
export type LeaderboardGraphEntry = LeaderboardGraphData['graph'][number]
export type PublicUserProfile = ResponseData<typeof GoodUserDataV2>
export type Solve = UserProfile['solves'][number]
export type Sponsor = ClientConfig['sponsors'][number]
export type UploadedFile = ResponseData<typeof GoodFilesUploadV2>[number]
export type UserProfile = ResponseData<typeof GoodUserSelfDataV2>
