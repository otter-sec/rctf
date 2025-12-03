import { z } from 'zod'
import { Permissions } from '../../enums/permissions'
import { defineRoute } from '../../internal'
import {
  BadChallenge,
  BadPerms,
  BadToken,
  GoodAdminChallengesV2,
  GoodAdminChallengeV2,
  GoodChallengeUpdateV2,
  GoodFilesUploadV2,
} from '../../responses'
import {
  ChallengeFileSchemaV2,
  ChallengePointsSchema,
  FileFieldSchema,
  PartialInstancerConfigSchema,
} from '../../util'

const AdminChallengeParams = z.object({
  id: z.string(),
})

export const GetAdminChallengesRouteV2 = defineRoute({
  path: '/v2/admin/challs',
  method: 'GET',
  responses: [GoodAdminChallengesV2, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
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
  responses: [GoodChallengeUpdateV2, BadPerms, BadToken],
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
