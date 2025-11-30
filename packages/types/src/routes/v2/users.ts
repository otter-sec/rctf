import { z } from 'zod'
import { defineRoute } from '../../internal'
import {
  BadAvatarFile,
  BadAvatarFileSize,
  BadDivisionNotAllowed,
  BadEnded,
  BadKnownName,
  BadName,
  BadRateLimit,
  BadToken,
  BadUnknownUser,
  GoodAvatarUpdated,
  GoodUserDataV2,
  GoodUserSelfDataV2,
  GoodUserUpdateV2,
} from '../../responses'
import { FileFieldSchema, UserName } from '../../util'

export const GetUserRouteV2 = defineRoute({
  path: '/v2/users/:id',
  method: 'GET',
  responses: [GoodUserDataV2, BadUnknownUser],
  authRequired: false,
  params: z.object({
    id: z.string(),
  }),
})

export const GetUserSelfRouteV2 = defineRoute({
  path: '/v2/users/me',
  method: 'GET',
  responses: [GoodUserSelfDataV2, BadToken],
  authRequired: true,
})

export const UpdateUserRouteV2 = defineRoute({
  path: '/v2/users/me',
  method: 'PATCH',
  body: z.object({
    name: UserName.optional(),
    division: z.string().optional(),
  }),
  responses: [
    GoodUserUpdateV2,
    BadEnded,
    BadName,
    BadRateLimit,
    BadDivisionNotAllowed,
    BadKnownName,
    BadToken,
  ],
  authRequired: true,
})

export const UpdateAvatarRoute = defineRoute({
  path: '/v2/users/me/avatar',
  method: 'PATCH',
  responses: [BadToken, BadAvatarFile, BadAvatarFileSize, GoodAvatarUpdated],
  authRequired: true,
  body: z.object({
    avatar: FileFieldSchema.optional(),
  }),
  bodyFormat: 'form-data',
})
