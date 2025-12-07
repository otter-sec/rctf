import { z } from 'zod'
import { ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadAvatarFile,
  BadAvatarFileSize,
  BadCaptcha,
  BadDivisionNotAllowed,
  BadEmail,
  BadEnded,
  BadKnownEmail,
  BadKnownName,
  BadName,
  BadRateLimit,
  BadToken,
  BadUnknownUser,
  GoodAvatarUpdated,
  GoodEmailSet,
  GoodUserDataV2,
  GoodUserSelfDataV2,
  GoodUserUpdateV2,
  GoodVerifySent,
} from '../../responses'
import { FileFieldSchema, UserEmail, UserName } from '../../util'

export const GetUserRouteV2 = defineRoute({
  path: '/v2/users/:id',
  method: 'GET',
  goodResponses: [GoodUserDataV2],
  badResponses: [BadUnknownUser],
  authRequired: false,
  params: z.object({
    id: z.string(),
  }),
})

export const GetUserSelfRouteV2 = defineRoute({
  path: '/v2/users/me',
  method: 'GET',
  goodResponses: [GoodUserSelfDataV2],
  badResponses: [BadToken],
  authRequired: true,
})

export const UpdateUserRouteV2 = defineRoute({
  path: '/v2/users/me',
  method: 'PATCH',
  body: z.object({
    name: UserName.optional(),
    division: z.string().optional(),
  }),
  goodResponses: [GoodUserUpdateV2],
  badResponses: [
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
  captchaAction: ProtectedAction.AvatarUpload,
  goodResponses: [GoodAvatarUpdated],
  badResponses: [BadToken, BadAvatarFile, BadAvatarFileSize, BadCaptcha],
  authRequired: true,
  body: z.object({
    avatar: FileFieldSchema.optional(),
    captchaCode: z.string().optional(),
  }),
  bodyFormat: 'form-data',
})

export const SetEmailRouteV2 = defineRoute({
  path: '/v2/users/me/auth/email',
  method: 'PUT',
  captchaAction: ProtectedAction.SetEmail,
  body: z.object({
    email: UserEmail,
    captchaCode: z.string().optional(),
  }),
  goodResponses: [GoodEmailSet, GoodVerifySent],
  badResponses: [BadEmail, BadKnownEmail, BadUnknownUser, BadCaptcha, BadToken],
  authRequired: true,
})
