import { z } from 'zod/mini'
import { Permissions } from '../../enums/permissions'
import { defineRoute } from '../../internal'
import {
  BadBody,
  BadChallenge,
  BadDataUri,
  BadPerms,
  BadToken,
  GoodAdminChallenge,
  GoodAdminChallenges,
  GoodChallengeDelete,
  GoodChallengeUpdate,
  GoodFilesUpload,
  GoodUploadsQuery,
} from '../../responses'
import { UploadFileName, UploadSha256 } from '../../util'

const AdminChallengeParams = z.object({
  id: z.string(),
})

export const GetAdminChallengesRoute = defineRoute({
  path: '/v1/admin/challs',
  method: 'GET',
  goodResponses: [GoodAdminChallenges],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})

export const GetAdminChallengeRoute = defineRoute({
  path: '/v1/admin/challs/:id',
  method: 'GET',
  goodResponses: [GoodAdminChallenge],
  badResponses: [BadChallenge, BadPerms, BadToken],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsRead,
})

export const UpdateChallengeRoute = defineRoute({
  path: '/v1/admin/challs/:id',
  method: 'PUT',
  body: z.object({
    data: z.object({
      author: z.optional(z.string()),
      category: z.optional(z.string()),
      description: z.optional(z.string()),
      flag: z.optional(z.string()),
      name: z.optional(z.string()),
      points: z.optional(
        z.object({
          max: z.int(),
          min: z.int(),
        })
      ),
      tiebreakEligible: z.optional(z.boolean()),
      files: z.optional(
        z.array(
          z.object({
            name: z.string(),
            url: z.string(),
          })
        )
      ),
      sortWeight: z.optional(z.number()),
    }),
  }),
  goodResponses: [GoodChallengeUpdate],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsWrite,
})

export const DeleteChallengeRoute = defineRoute({
  path: '/v1/admin/challs/:id',
  method: 'DELETE',
  goodResponses: [GoodChallengeDelete],
  badResponses: [BadPerms, BadToken],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsWrite,
})

export const UploadFilesRoute = defineRoute({
  path: '/v1/admin/upload',
  method: 'POST',
  body: z.object({
    files: z.array(
      z.object({
        name: UploadFileName,
        data: z.string(),
      })
    ),
  }),
  goodResponses: [GoodFilesUpload],
  badResponses: [BadBody, BadDataUri, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsWrite,
})

export const QueryUploadsRoute = defineRoute({
  path: '/v1/admin/upload/query',
  method: 'POST',
  body: z.object({
    uploads: z.array(
      z.object({
        sha256: UploadSha256,
        name: UploadFileName,
      })
    ),
  }),
  goodResponses: [GoodUploadsQuery],
  badResponses: [BadBody, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})
