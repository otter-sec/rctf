import type { ResponseData } from '../internal'
import {
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
  GoodClientConfigV2,
  GoodFilesUploadV2,
  GoodLeaderboardGraph,
  GoodLeaderboardV2,
  GoodMemberData,
  GoodUserDataV2,
  GoodUserSelfDataV2,
} from '../responses'

export type AdminChallenge = ResponseData<typeof GoodAdminChallengesV2>[number]
export type AdminChallengeDetail = ResponseData<typeof GoodAdminChallengeV2>
export type InstancerConfig = NonNullable<
  AdminChallengeDetail['instancerConfig']
>

export type Challenge = ResponseData<typeof GoodChallengesV2>[number]
export type ChallengeSolve = ResponseData<
  typeof GoodChallengeSolvesV2
>['solves'][number]

export type ClientConfig = ResponseData<typeof GoodClientConfigV2>
export type Sponsor = ClientConfig['sponsors'][number]

export type LeaderboardData = ResponseData<typeof GoodLeaderboardV2>
export type LeaderboardEntry = LeaderboardData['leaderboard'][number]
export type LeaderboardGraphData = ResponseData<typeof GoodLeaderboardGraph>
export type LeaderboardGraphEntry = LeaderboardGraphData['graph'][number]
export type GraphPoint = LeaderboardGraphEntry['points'][number]

export type UserProfile = ResponseData<typeof GoodUserSelfDataV2>
export type PublicUserProfile = ResponseData<typeof GoodUserDataV2>
export type Solve = UserProfile['solves'][number]

export type Member = ResponseData<typeof GoodMemberData>[number]

export type UploadedFile = ResponseData<typeof GoodFilesUploadV2>[number]
