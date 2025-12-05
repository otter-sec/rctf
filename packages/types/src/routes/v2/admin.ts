import { z } from 'zod'
import { Permissions } from '../../enums/permissions'
import { defineRoute } from '../../internal'
import {
  BadChallenge,
  BadEndpoint,
  BadInstancerConfig,
  BadPerms,
  BadToken,
  BadUnknownSolveV2,
  BadUnknownUser,
  BadUserPrivileged,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodChallengeSolveDeleteV2,
  GoodChallengeUpdateV2,
  GoodCreateUserTokenV2,
  GoodFilesUploadV2,
  GoodInstancerSchema,
} from '../../responses'
import {
  ChallengeFileSchemaV2,
  ChallengePointsSchema,
  FileFieldSchema,
  PartialInstancerConfigSchema,
} from '../../util'

export const GetAdminChallengesRouteV2 = defineRoute({
  path: '/v2/admin/challs',
  method: 'GET',
  responses: [GoodAdminChallengesV2, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})

const AdminChallengeParams = z.object({
  id: z.string(),
})

export const GetAdminChallengeRouteV2 = defineRoute({
  path: '/v2/admin/challs/:id',
  method: 'GET',
  responses: [GoodAdminChallengeV2, BadChallenge, BadPerms, BadToken],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsRead,
})

export const UpdateChallengeRouteV2 = defineRoute({
  path: '/v2/admin/challs/:id',
  method: 'PUT',
  body: z.object({
    data: z.object({
      author: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      flag: z.string().optional(),
      name: z.string().optional(),
      points: ChallengePointsSchema.optional(),
      tiebreakEligible: z.boolean().optional(),
      files: z.array(ChallengeFileSchemaV2).optional(),
      sortWeight: z.number().optional(),
      instancerConfig: PartialInstancerConfigSchema.nullish(),
    }),
  }),
  responses: [GoodChallengeUpdateV2, BadInstancerConfig, BadPerms, BadToken],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsWrite,
})

export const UploadFilesRouteV2 = defineRoute({
  path: '/v2/admin/upload',
  method: 'POST',
  body: z.object({
    files: z.array(FileFieldSchema),
  }),
  responses: [GoodFilesUploadV2, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsWrite,
  bodyFormat: 'form-data',
})

export const CreateUserTokenRouteV2 = defineRoute({
  path: '/v2/admin/users/:id/token',
  method: 'POST',
  responses: [
    GoodCreateUserTokenV2,
    BadPerms,
    BadToken,
    BadUnknownUser,
    BadUserPrivileged,
  ],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  permissions: Permissions.usersWrite,
})

export const DeleteChallengeSolveRouteV2 = defineRoute({
  path: '/v2/admin/challs/:challengeId/solves/:userId',
  method: 'DELETE',
  responses: [
    GoodChallengeSolveDeleteV2,
    BadPerms,
    BadToken,
    BadUnknownSolveV2,
  ],
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
  responses: [GoodInstancerSchema, BadEndpoint, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})
