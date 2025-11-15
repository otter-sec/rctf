import { z } from 'zod'
import { Permissions } from '../enums/permissions'
import { defineRoute } from '../internal'
import {
  BadChallenge,
  BadDataUri,
  GoodAdminChallenge,
  GoodAdminChallenges,
  GoodChallengeDelete,
  GoodChallengeUpdate,
  GoodFilesUpload,
  GoodUploadsQuery,
} from '../responses'

const AdminChallengeParams = z.object({
  id: z.string(),
})

export const GetAdminChallengesRoute = defineRoute({
  path: '/v1/admin/challs',
  method: 'GET',
  responses: [GoodAdminChallenges],
  authRequired: true,
  permissions: Permissions.challsRead,
})

export const GetAdminChallengeRoute = defineRoute({
  path: '/v1/admin/challs/:id',
  method: 'GET',
  responses: [GoodAdminChallenge, BadChallenge],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsRead,
})

export const UpdateChallengeRoute = defineRoute({
  path: '/v1/admin/challs/:id',
  method: 'PUT',
  body: z.object({
    data: z.object({
      author: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      flag: z.string().optional(),
      name: z.string().optional(),
      points: z
        .object({
          max: z.number().int(),
          min: z.number().int(),
        })
        .optional(),
      tiebreakEligible: z.boolean().optional(),
      files: z
        .array(
          z.object({
            name: z.string(),
            url: z.string(),
          })
        )
        .optional(),
      sortWeight: z.number().optional(),
    }),
  }),
  responses: [GoodChallengeUpdate],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsWrite,
})

export const DeleteChallengeRoute = defineRoute({
  path: '/v1/admin/challs/:id',
  method: 'DELETE',
  responses: [GoodChallengeDelete],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsWrite,
})

export const UploadFilesRoute = defineRoute({
  path: '/v1/admin/upload',
  method: 'POST',
  body: z.array(
    z.object({
      name: z.string(),
      data: z.string(),
    })
  ),
  responses: [GoodFilesUpload, BadDataUri],
  authRequired: true,
  permissions: Permissions.challsWrite,
})

export const QueryUploadsRoute = defineRoute({
  path: '/v1/admin/upload/query',
  method: 'POST',
  body: z.array(
    z.object({
      sha256: z.string(),
      name: z.string(),
    })
  ),
  responses: [GoodUploadsQuery],
  authRequired: true,
  permissions: Permissions.challsRead,
})
