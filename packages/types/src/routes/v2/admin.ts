import { z } from 'zod/mini'
import { Permissions } from '../../enums/permissions'
import { defineRoute } from '../../internal'
import {
  BadAdminBotConfig,
  BadBody,
  BadChallenge,
  BadEndpoint,
  BadInstancerConfig,
  BadPerms,
  BadToken,
  BadUnknownSolveV2,
  BadUnknownUser,
  BadUserPrivileged,
  GoodAdminBotChallengeSource,
  GoodAdminBotJobPull,
  GoodAdminBotJobUpdate,
  GoodAdminBotStatus,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodAdminUsersV2,
  GoodChallengeSolveDeleteV2,
  GoodChallengeUpdateV2,
  GoodCreateUserTokenV2,
  GoodFilesUploadV2,
  GoodInstancerSchema,
  GoodUploadsQueryV2,
} from '../../responses'
import {
  ChallengeFileSchemaV2,
  ChallengePointsSchema,
  MultipleFileFieldSchema,
  PartialInstancerConfigSchema,
} from '../../util'

export const GetAdminChallengesRouteV2 = defineRoute({
  path: '/v2/admin/challs',
  method: 'GET',
  goodResponses: [GoodAdminChallengesV2],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})

export const GetAdminUsersRouteV2 = defineRoute({
  path: '/v2/admin/users',
  method: 'GET',
  query: z.object({
    limit: z.pipe(z.coerce.number(), z.int()).check(z.gte(1)).check(z.lte(100)),
    offset: z.pipe(z.coerce.number(), z.int()).check(z.gte(0)),
  }),
  goodResponses: [GoodAdminUsersV2],
  badResponses: [BadBody, BadPerms, BadToken],
  authRequired: true,
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
      releaseTime: z.optional(z.nullable(z.number())),
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
  authRequired: false, // adminbot auth will be checked by the middleware
  params: z.object({ id: z.string() }),
})

export const PullAdminBotJobRouteV2 = defineRoute({
  path: '/v2/admin/admin-bot/jobs/pull',
  method: 'POST',
  goodResponses: [GoodAdminBotJobPull],
  authRequired: false, // adminbot auth will be checked by the middleware
})

export const CompleteAdminBotJobRouteV2 = defineRoute({
  path: '/v2/admin/admin-bot/jobs/:id/complete',
  method: 'POST',
  body: z.object({
    logs: z.optional(z.string().check(z.maxLength(1_048_576))),
  }),
  goodResponses: [GoodAdminBotJobUpdate],
  badResponses: [BadEndpoint],
  authRequired: false, // adminbot auth will be checked by the middleware
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
  authRequired: false, // adminbot auth will be checked by the middleware
  params: z.object({ id: z.string() }),
})
