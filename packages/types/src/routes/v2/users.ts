import { ALL_REGIONS } from '@rctf/util'
import { z } from 'zod/mini'
import { Permissions, ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadAvatarFile,
  BadAvatarFileSize,
  BadCaptcha,
  BadCredentials,
  BadDivisionChangeEnded,
  BadDivisionNotAllowed,
  BadEmail,
  BadEmailChangeDivision,
  BadKnownEmail,
  BadKnownName,
  BadModerationNotPassed,
  BadName,
  BadNotStarted,
  BadPassword,
  BadRateLimit,
  BadToken,
  BadUnknownUser,
  BadZeroAuth,
  GoodAvatarUpdated,
  GoodEmailSet,
  GoodPasswordRemoved,
  GoodPasswordSet,
  GoodUserDataV2,
  GoodUserSelfDataV2,
  GoodUserUpdateV2,
  GoodVerifySent,
} from '../../responses'
import { FileFieldSchema, UserEmail, UserName, UserPassword } from '../../util'

export const GetUserRouteV2 = defineRoute({
  path: '/v2/users/:id',
  method: 'GET',
  goodResponses: [GoodUserDataV2],
  badResponses: [BadUnknownUser, BadNotStarted],
  authRequired: false,
  params: z.object({
    id: z.string().check(z.describe('Team ID.')),
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
    division: z.optional(
      z.string().check(z.describe('Division to switch the team to.'))
    ),
    countryCode: z
      .optional(z.nullable(z.enum(ALL_REGIONS.map(r => r.code))))
      .check(
        z.describe('ISO 3166-1 alpha-2 country code, or `null` to clear.')
      ),
    statusText: z
      .optional(z.nullable(z.string().check(z.maxLength(60))))
      .check(
        z.describe('Free-form status badge (max 60 chars), or `null` to clear.')
      ),
  }),
  goodResponses: [GoodUserUpdateV2],
  badResponses: [
    BadName,
    BadRateLimit,
    BadDivisionNotAllowed,
    BadDivisionChangeEnded,
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
    avatar: z
      .optional(FileFieldSchema)
      .check(z.describe('Avatar image file (multipart form-data).')),
    captchaCode: z
      .optional(z.string())
      .check(z.describe('Checked only when captcha protects this route.')),
  }),
  bodyFormat: 'form-data',
})

export const SetEmailRouteV2 = defineRoute({
  path: '/v2/users/me/auth/email',
  method: 'PUT',
  captchaAction: ProtectedAction.SetEmail,
  body: z.object({
    email: UserEmail,
    captchaCode: z
      .optional(z.string())
      .check(z.describe('Checked only when captcha protects this route.')),
  }),
  goodResponses: [GoodEmailSet, GoodVerifySent],
  badResponses: [
    BadEmail,
    BadKnownEmail,
    BadEmailChangeDivision,
    BadUnknownUser,
    BadCaptcha,
    BadRateLimit,
    BadToken,
  ],
  authRequired: true,
})

export const SetPasswordRouteV2 = defineRoute({
  path: '/v2/users/me/auth/password',
  method: 'PUT',
  body: z.object({
    password: UserPassword,
    currentPassword: z
      .optional(z.string())
      .check(
        z.describe('Required when the account already has a password set.')
      ),
  }),
  goodResponses: [GoodPasswordSet],
  badResponses: [
    BadPassword,
    BadCredentials,
    BadUnknownUser,
    BadRateLimit,
    BadToken,
  ],
  authRequired: true,
})

export const DeletePasswordRouteV2 = defineRoute({
  path: '/v2/users/me/auth/password',
  method: 'DELETE',
  body: z.object({
    currentPassword: z
      .string()
      .check(z.describe('The password being removed.')),
  }),
  goodResponses: [GoodPasswordRemoved],
  badResponses: [
    BadCredentials,
    BadZeroAuth,
    BadUnknownUser,
    BadRateLimit,
    BadToken,
  ],
  authRequired: true,
})
