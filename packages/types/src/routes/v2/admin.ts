import { z } from 'zod/mini'
import { Permissions } from '../../enums/permissions'
import { defineRoute } from '../../internal'
import {
  BadAdminBotConfig,
  BadBody,
  BadChallenge,
  BadEndpoint,
  BadInstancerConfig,
  BadKnownEmail,
  BadKnownName,
  BadPerms,
  BadToken,
  BadUnknownSolveV2,
  BadUnknownUser,
  BadUnknownVerification,
  BadUserPrivileged,
  GoodAdminBotChallengeSource,
  GoodAdminBotJobPull,
  GoodAdminBotJobUpdate,
  GoodAdminBotQueueDepth,
  GoodAdminBotStatus,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodAdminSettings,
  GoodAdminSettingsUpdate,
  GoodAdminSubmissionLogs,
  GoodAdminUserDeleteV2,
  GoodAdminUsersV2,
  GoodAdminUserUpdateV2,
  GoodAdminUserV2,
  GoodAdminUserVerificationCompleteV2,
  GoodAdminUserVerificationResendV2,
  GoodAdminUserVerificationsV2,
  GoodChallengeSolveDeleteV2,
  GoodChallengeUpdateV2,
  GoodCreateUserTokenV2,
  GoodFilesUploadV2,
  GoodInstancerSchema,
  GoodUploadsQueryV2,
} from '../../responses'
import {
  AdminTeamSortBy,
  AdminTeamStatus,
  ChallengeFileSchemaV2,
  ChallengePointsSchema,
  MultipleFileFieldSchema,
  PartialInstancerConfigSchema,
  searchFilter,
  SortOrder,
  SubmissionLogKind,
  SubmissionLogResult,
  SubmissionLogSortBy,
  SubmissionLogSortOrder,
  SubmissionLogTeamStatus,
} from '../../util'

export const GetAdminChallengesRouteV2 = defineRoute({
  path: '/v2/admin/challs',
  method: 'GET',
  goodResponses: [GoodAdminChallengesV2],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})

const AdminUsersQuery = z.object({
  limit: z.pipe(z.coerce.number(), z.int()).check(z.gte(1)).check(z.lte(100)),
  offset: z.pipe(z.coerce.number(), z.int()).check(z.gte(0)),
  search: z.optional(z.string().check(z.minLength(1)).check(z.maxLength(100))),
  sortBy: z.optional(z.enum(AdminTeamSortBy)),
  sortOrder: z.optional(z.enum(SortOrder)),
})

const AdminUsersFilterBody = z.object({
  status: z.nullish(searchFilter(z.enum(AdminTeamStatus))),
  division: z.nullish(searchFilter(z.string())),
})

export const GetAdminUsersRouteV2 = defineRoute({
  path: '/v2/admin/users',
  method: 'GET',
  query: AdminUsersQuery,
  goodResponses: [GoodAdminUsersV2],
  badResponses: [BadBody, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.usersWrite,
})

export const FilterAdminUsersRouteV2 = defineRoute({
  path: '/v2/admin/users',
  method: 'POST',
  query: AdminUsersQuery,
  body: AdminUsersFilterBody,
  goodResponses: [GoodAdminUsersV2],
  badResponses: [BadBody, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.usersWrite,
})

export const GetAdminSubmissionLogsRouteV2 = defineRoute({
  path: '/v2/admin/submission-logs',
  method: 'GET',
  query: z.object({
    limit: z.pipe(z.coerce.number(), z.int()).check(z.gte(1)).check(z.lte(100)),
    offset: z.pipe(z.coerce.number(), z.int()).check(z.gte(0)),
    sortBy: z.optional(z.enum(SubmissionLogSortBy)),
    sortOrder: z.optional(z.enum(SubmissionLogSortOrder)),
    challengeId: z.optional(z.string()),
    challengeIds: z.optional(z.string().check(z.maxLength(2000))),
    excludeChallengeIds: z.optional(z.string().check(z.maxLength(2000))),
    challengeSearch: z.optional(z.string().check(z.maxLength(100))),
    userId: z.optional(z.string()),
    userIds: z.optional(z.string().check(z.maxLength(2000))),
    excludeUserIds: z.optional(z.string().check(z.maxLength(2000))),
    teamSearch: z.optional(z.string().check(z.maxLength(100))),
    kind: z.optional(z.enum(SubmissionLogKind)),
    kinds: z.optional(z.string().check(z.maxLength(2000))),
    excludeKinds: z.optional(z.string().check(z.maxLength(2000))),
    result: z.optional(z.enum(SubmissionLogResult)),
    results: z.optional(z.string().check(z.maxLength(2000))),
    excludeResults: z.optional(z.string().check(z.maxLength(2000))),
    teamStatus: z.optional(z.enum(SubmissionLogTeamStatus)),
    teamStatuses: z.optional(z.string().check(z.maxLength(2000))),
    excludeTeamStatuses: z.optional(z.string().check(z.maxLength(2000))),
    categories: z.optional(z.string().check(z.maxLength(2000))),
    excludeCategories: z.optional(z.string().check(z.maxLength(2000))),
    divisions: z.optional(z.string().check(z.maxLength(2000))),
    excludeDivisions: z.optional(z.string().check(z.maxLength(2000))),
    createdAfter: z.optional(z.string().check(z.maxLength(64))),
    createdBefore: z.optional(z.string().check(z.maxLength(64))),
  }),
  goodResponses: [GoodAdminSubmissionLogs],
  badResponses: [BadBody, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.usersWrite | Permissions.challsRead,
})

const AdminUserParams = z.object({
  id: z.string(),
})

export const GetAdminUserRouteV2 = defineRoute({
  path: '/v2/admin/users/:id',
  method: 'GET',
  goodResponses: [GoodAdminUserV2],
  badResponses: [BadPerms, BadToken, BadUnknownUser],
  authRequired: true,
  params: AdminUserParams,
  permissions: Permissions.usersWrite | Permissions.challsRead,
})

export const UpdateAdminUserRouteV2 = defineRoute({
  path: '/v2/admin/users/:id',
  method: 'PUT',
  body: z.object({
    data: z.object({
      banned: z.optional(z.boolean()),
    }),
  }),
  goodResponses: [GoodAdminUserUpdateV2],
  badResponses: [
    BadBody,
    BadPerms,
    BadToken,
    BadUnknownUser,
    BadUserPrivileged,
  ],
  authRequired: true,
  params: AdminUserParams,
  permissions: Permissions.usersWrite,
})

export const DeleteAdminUserRouteV2 = defineRoute({
  path: '/v2/admin/users/:id',
  method: 'DELETE',
  goodResponses: [GoodAdminUserDeleteV2],
  badResponses: [BadPerms, BadToken, BadUnknownUser, BadUserPrivileged],
  authRequired: true,
  params: AdminUserParams,
  permissions: Permissions.usersWrite,
})

const AdminUserVerificationParams = z.object({
  id: z.string(),
})

export const GetAdminUserVerificationsRouteV2 = defineRoute({
  path: '/v2/admin/user-verifications',
  method: 'GET',
  goodResponses: [GoodAdminUserVerificationsV2],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.usersWrite,
})

export const CompleteAdminUserVerificationRouteV2 = defineRoute({
  path: '/v2/admin/user-verifications/:id/complete',
  method: 'POST',
  goodResponses: [GoodAdminUserVerificationCompleteV2],
  badResponses: [
    BadKnownEmail,
    BadKnownName,
    BadPerms,
    BadToken,
    BadUnknownVerification,
  ],
  authRequired: true,
  params: AdminUserVerificationParams,
  permissions: Permissions.usersWrite,
})

export const ResendAdminUserVerificationRouteV2 = defineRoute({
  path: '/v2/admin/user-verifications/:id/resend',
  method: 'POST',
  goodResponses: [GoodAdminUserVerificationResendV2],
  badResponses: [BadEndpoint, BadPerms, BadToken, BadUnknownVerification],
  authRequired: true,
  params: AdminUserVerificationParams,
  permissions: Permissions.usersWrite,
})

const AdminChallengeParams = z.object({
  id: z.string(),
})

export const GetAdminChallengeRouteV2 = defineRoute({
  path: '/v2/admin/challs/:id',
  method: 'GET',
  goodResponses: [GoodAdminChallengeV2],
  badResponses: [BadChallenge, BadPerms, BadToken],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsRead,
})

export const UpdateChallengeRouteV2 = defineRoute({
  path: '/v2/admin/challs/:id',
  method: 'PUT',
  body: z.object({
    data: z.object({
      author: z.optional(z.string()),
      category: z.optional(z.string()),
      description: z.optional(z.string()),
      flag: z.optional(z.string()),
      name: z.optional(z.string()),
      points: z.optional(ChallengePointsSchema),
      tiebreakEligible: z.optional(z.boolean()),
      files: z.optional(z.array(ChallengeFileSchemaV2)),
      sortWeight: z.optional(z.number()),
      instancerConfig: z.nullish(PartialInstancerConfigSchema),
      adminBotConfig: z.nullish(z.object({ code: z.string() })),
      hidden: z.optional(z.boolean()),
      releaseTime: z.optional(z.nullable(z.int())),
    }),
  }),
  goodResponses: [GoodChallengeUpdateV2],
  badResponses: [BadAdminBotConfig, BadInstancerConfig, BadPerms, BadToken],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsWrite,
})

export const UploadFilesRouteV2 = defineRoute({
  path: '/v2/admin/upload',
  method: 'POST',
  body: z.object({
    files: MultipleFileFieldSchema,
  }),
  goodResponses: [GoodFilesUploadV2],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsWrite,
  bodyFormat: 'form-data',
})

export const CreateUserTokenRouteV2 = defineRoute({
  path: '/v2/admin/users/:id/token',
  method: 'POST',
  goodResponses: [GoodCreateUserTokenV2],
  badResponses: [BadPerms, BadToken, BadUnknownUser, BadUserPrivileged],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  permissions: Permissions.usersWrite,
})

export const DeleteChallengeSolveRouteV2 = defineRoute({
  path: '/v2/admin/challs/:challengeId/solves/:userId',
  method: 'DELETE',
  goodResponses: [GoodChallengeSolveDeleteV2],
  badResponses: [BadPerms, BadToken, BadUnknownSolveV2],
  authRequired: true,
  params: z.object({
    challengeId: z.string(),
    userId: z.string(),
  }),
  permissions: Permissions.challsSolveWrite,
})

export const GetInstancerSchemaRouteV2 = defineRoute({
  path: '/v2/admin/instancer/schema',
  method: 'GET',
  goodResponses: [GoodInstancerSchema],
  badResponses: [BadEndpoint, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})

export const GetAdminBotStatusRouteV2 = defineRoute({
  path: '/v2/admin/admin-bot/status',
  method: 'GET',
  goodResponses: [GoodAdminBotStatus],
  badResponses: [BadEndpoint, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})

export const QueryUploadsRouteV2 = defineRoute({
  path: '/v2/admin/upload/query',
  method: 'POST',
  body: z.object({
    uploads: z.array(
      z.object({
        sha256: z.string(),
        name: z.string(),
      })
    ),
  }),
  goodResponses: [GoodUploadsQueryV2],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})

export const GetAdminBotChallengeSourceRouteV2 = defineRoute({
  path: '/v2/admin/admin-bot/challenges/:id/source',
  method: 'GET',
  goodResponses: [GoodAdminBotChallengeSource],
  badResponses: [BadEndpoint],
  serviceAuth: 'adminBot',
  params: z.object({ id: z.string() }),
})

export const GetAdminBotQueueDepthRouteV2 = defineRoute({
  path: '/v2/admin/admin-bot/queue-depth',
  method: 'GET',
  goodResponses: [GoodAdminBotQueueDepth],
  serviceAuth: 'adminBot',
})

export const PullAdminBotJobRouteV2 = defineRoute({
  path: '/v2/admin/admin-bot/jobs/pull',
  method: 'POST',
  goodResponses: [GoodAdminBotJobPull],
  serviceAuth: 'adminBot',
})

export const CompleteAdminBotJobRouteV2 = defineRoute({
  path: '/v2/admin/admin-bot/jobs/:id/complete',
  method: 'POST',
  body: z.object({
    logs: z.optional(z.string().check(z.maxLength(1_048_576))),
  }),
  goodResponses: [GoodAdminBotJobUpdate],
  badResponses: [BadEndpoint],
  serviceAuth: 'adminBot',
  params: z.object({ id: z.string() }),
})

export const FailAdminBotJobRouteV2 = defineRoute({
  path: '/v2/admin/admin-bot/jobs/:id/fail',
  method: 'POST',
  body: z.object({
    logs: z.optional(z.string().check(z.maxLength(1_048_576))),
  }),
  goodResponses: [GoodAdminBotJobUpdate],
  badResponses: [BadEndpoint],
  serviceAuth: 'adminBot',
  params: z.object({ id: z.string() }),
})

export const GetAdminSettingsRouteV2 = defineRoute({
  path: '/v2/admin/settings',
  method: 'GET',
  goodResponses: [GoodAdminSettings],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.settingsWrite,
})

const AdminSettingsUpdateBody = z.object({
  data: z.object({
    ctfName: z.nullish(z.string()),
    homeContent: z.nullish(z.string()),
    startTime: z.nullish(z.int()),
    endTime: z.nullish(z.int()),
    sponsors: z.nullish(
      z.array(
        z.object({
          name: z.string(),
          icon: z.string(),
          description: z.string(),
          url: z.optional(z.string()),
        })
      )
    ),
    meta: z.nullish(
      z.object({
        description: z.optional(z.string()),
        imageUrl: z.optional(z.string()),
      })
    ),
    faviconUrl: z.nullish(z.string()),
    logoLightUrl: z.nullish(z.string()),
    logoDarkUrl: z.nullish(z.string()),
  }),
})

export const UpdateAdminSettingsRouteV2 = defineRoute({
  path: '/v2/admin/settings',
  method: 'PUT',
  body: AdminSettingsUpdateBody,
  goodResponses: [GoodAdminSettingsUpdate],
  badResponses: [BadBody, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.settingsWrite,
})
