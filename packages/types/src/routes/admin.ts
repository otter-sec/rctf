import { defineRoute } from '../dsl'
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

export const GetAdminChallengesRoute = defineRoute({
  path: '/admin/challs',
  method: 'GET',
  responses: [GoodAdminChallenges],
  authRequired: true,
})

export const GetAdminChallengeRoute = defineRoute({
  path: '/admin/challs/:id',
  method: 'GET',
  responses: [GoodAdminChallenge, BadChallenge],
  authRequired: true,
})

export const UpdateChallengeRoute = defineRoute({
  path: '/admin/challs/:id',
  method: 'PUT',
  body: UpdateChallengeBody,
  responses: [GoodChallengeUpdate],
  authRequired: true,
})

export const DeleteChallengeRoute = defineRoute({
  path: '/admin/challs/:id',
  method: 'DELETE',
  responses: [GoodChallengeDelete],
  authRequired: true,
})

export const UploadFilesRoute = defineRoute({
  path: '/admin/upload',
  method: 'POST',
  body: UploadFilesBody,
  responses: [GoodFilesUpload, BadDataUri],
  authRequired: true,
})

export const QueryUploadsRoute = defineRoute({
  path: '/admin/upload/query',
  method: 'POST',
  body: QueryUploadsBody,
  responses: [GoodUploadsQuery],
  authRequired: true,
})
