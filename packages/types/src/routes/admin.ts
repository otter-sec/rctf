import { z } from 'zod'

import { defineRoute } from '../internal'
import { Permissions } from '../enums/permissions'
import {
  QueryUploadsBody,
  UpdateChallengeBody,
  UploadFilesBody,
} from '../models'
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
  path: '/admin/challs',
  method: 'GET',
  responses: [GoodAdminChallenges],
  authRequired: true,
  permissions: Permissions.challsRead,
})

export const GetAdminChallengeRoute = defineRoute({
  path: '/admin/challs/:id',
  method: 'GET',
  responses: [GoodAdminChallenge, BadChallenge],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsRead,
})

export const UpdateChallengeRoute = defineRoute({
  path: '/admin/challs/:id',
  method: 'PUT',
  body: UpdateChallengeBody,
  responses: [GoodChallengeUpdate],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsWrite,
})

export const DeleteChallengeRoute = defineRoute({
  path: '/admin/challs/:id',
  method: 'DELETE',
  responses: [GoodChallengeDelete],
  authRequired: true,
  params: AdminChallengeParams,
  permissions: Permissions.challsWrite,
})

export const UploadFilesRoute = defineRoute({
  path: '/admin/upload',
  method: 'POST',
  body: UploadFilesBody,
  responses: [GoodFilesUpload, BadDataUri],
  authRequired: true,
  permissions: Permissions.challsWrite,
})

export const QueryUploadsRoute = defineRoute({
  path: '/admin/upload/query',
  method: 'POST',
  body: QueryUploadsBody,
  responses: [GoodUploadsQuery],
  authRequired: true,
  permissions: Permissions.challsRead,
})
