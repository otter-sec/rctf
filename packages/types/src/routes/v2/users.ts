import { ALL_REGIONS } from '@rctf/util'
import { z } from 'zod/mini'
import { Permissions, ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadAvatarFile,
  BadAvatarFileSize,
  BadCaptcha,
  BadDivisionNotAllowed,
  BadEmail,
  BadEmailChangeDivision,
  BadEnded,
  BadKnownEmail,
  BadKnownName,
  BadModerationNotPassed,
  BadName,
  BadNotStarted,
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
  badResponses: [BadUnknownUser, BadNotStarted],
  authRequired: false,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  // challsRead because we return solves
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
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
    name: z.optional(UserName),
    division: z.optional(z.string()),
    countryCode: z.optional(z.nullable(z.enum(ALL_REGIONS.map(r => r.code)))),
    statusText: z.optional(z.nullable(z.string().check(z.maxLength(60)))),
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
  badResponses: [
    BadToken,
    BadAvatarFile,
    BadAvatarFileSize,
    BadCaptcha,
    BadRateLimit,
    BadModerationNotPassed,
  ],
  authRequired: true,
  body: z.object({
    avatar: z.optional(FileFieldSchema),
    captchaCode: z.optional(z.string()),
  }),
  bodyFormat: 'form-data',
})

export const SetEmailRouteV2 = defineRoute({
  path: '/v2/users/me/auth/email',
  method: 'PUT',
  captchaAction: ProtectedAction.SetEmail,
  body: z.object({
    email: UserEmail,
    captchaCode: z.optional(z.string()),
  }),
  goodResponses: [GoodEmailSet, GoodVerifySent],
  badResponses: [
    BadEmail,
    BadKnownEmail,
    BadEmailChangeDivision,
    BadUnknownUser,
    BadCaptcha,
    BadToken,
  ],
  authRequired: true,
})
