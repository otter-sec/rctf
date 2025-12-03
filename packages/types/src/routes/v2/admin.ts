import { z } from 'zod'
import { Permissions } from '../../enums/permissions'
import { defineRoute } from '../../internal'
import {
  BadPerms,
  BadToken,
  GoodChallengeUpdateV2,
  GoodFilesUploadV2,
} from '../../responses'
import { FileFieldSchema } from '../../util';

const AdminChallengeParams = z.object({
  id: z.string(),
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
            size: z.number().int(),
          })
        )
        .optional(),
      sortWeight: z.number().optional(),
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
