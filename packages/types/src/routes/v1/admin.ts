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
import { example } from '../../util/example'

const AdminChallengeParams = z.object({
  id: z.string().check(z.describe('Challenge ID.')),
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
    data: z
      .object({
        author: example(z.optional(z.string()), 'es3n1n').check(
          z.describe('Challenge author.')
        ),
        category: example(z.optional(z.string()), 'rev').check(
          z.describe('Challenge category.')
        ),
        description: example(
          z.optional(z.string()),
          'A gentle introduction.'
        ).check(z.describe('Challenge description in Markdown.')),
        flag: example(z.optional(z.string()), 'rctf{baby_rev}').check(
          z.describe('The challenge flag.')
        ),
        name: example(z.optional(z.string()), 'baby-rev').check(
          z.describe('Challenge name.')
        ),
        points: z.optional(
          z.object({
            max: example(z.int(), 500).check(
              z.describe('Maximum (initial) point value.')
            ),
            min: example(z.int(), 100).check(
              z.describe('Minimum (floor) point value.')
            ),
          })
        ),
        tiebreakEligible: example(z.optional(z.boolean()), true).check(
          z.describe('Whether solves count toward tiebreak ordering.')
        ),
        files: z.optional(
          z.array(
            z.object({
              name: example(z.string(), 'chall.zip').check(
                z.describe('File name.')
              ),
              url: example(
                z.string(),
                'https://rctf.osec.io/uploads/chall.zip'
              ).check(z.describe('File download URL.')),
            })
          )
        ),
        sortWeight: example(z.optional(z.number()), 0).check(
          z.describe('Manual ordering weight.')
        ),
      })
      .check(z.describe('Challenge fields to update.')),
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
        data: example(z.string(), 'data:application/zip;base64,UEsDBA==').check(
          z.describe('File contents as a base64 data URI.')
        ),
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
    uploads: z
      .array(
        z.object({
          sha256: UploadSha256,
          name: UploadFileName,
        })
      )
      .check(z.describe('Files to look up by hash and name.')),
  }),
  goodResponses: [GoodUploadsQuery],
  badResponses: [BadBody, BadPerms, BadToken],
  authRequired: true,
  permissions: Permissions.challsRead,
})
