import { z } from 'zod/mini'
import { ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadCtftimeNoExists,
  BadCtftimeToken,
  BadDivisionNotAllowed,
  BadEmail,
  BadEmailChangeDivision,
  BadEmailNoExists,
  BadEnded,
  BadEndpoint,
  BadKnownCtftimeId,
  BadKnownEmail,
  BadKnownName,
  BadName,
  BadRateLimit,
  BadRecaptchaCode,
  BadToken,
  BadUnknownUser,
  BadZeroAuth,
  GoodCtftimeAuthSet,
  GoodCtftimeRemoved,
  GoodEmailRemoved,
  GoodEmailSet,
  GoodMemberCreate,
  GoodMemberData,
  GoodMemberDelete,
  GoodUserData,
  GoodUserSelfData,
  GoodUserUpdate,
  GoodVerifySent,
} from '../../responses'
import { UserEmail, UserName } from '../../util'

export const GetUserRoute = defineRoute({
  path: '/v1/users/:id',
  method: 'GET',
  goodResponses: [GoodUserData],
  badResponses: [BadUnknownUser],
  authRequired: false,
  params: z.object({
    id: z.string(),
  }),
})

export const GetUserSelfRoute = defineRoute({
  path: '/v1/users/me',
  method: 'GET',
  goodResponses: [GoodUserSelfData],
  badResponses: [BadToken],
  authRequired: true,
})

// TODO(es3n1n): rctf v1 allows this only when not finished, do we want that?
export const UpdateUserRoute = defineRoute({
  path: '/v1/users/me',
  method: 'PATCH',
  body: z.object({
    name: z.optional(UserName),
    division: z.optional(z.string()),
  }),
  goodResponses: [GoodUserUpdate],
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

export const GetMembersRoute = defineRoute({
  path: '/v1/users/me/members',
  method: 'GET',
  goodResponses: [GoodMemberData],
  badResponses: [BadEndpoint, BadToken],
  authRequired: true,
})

// TODO(es3n1n): rctf v1 allows this only when not finished, do we want that?
export const CreateMemberRoute = defineRoute({
  path: '/v1/users/me/members',
  method: 'POST',
  body: z.object({
    email: UserEmail,
  }),
  goodResponses: [GoodMemberCreate],
  badResponses: [BadEndpoint, BadEnded, BadEmail, BadKnownEmail, BadToken],
  authRequired: true,
})

// TODO(es3n1n): rctf v1 allows this only when not finished, do we want that?
export const DeleteMemberRoute = defineRoute({
  path: '/v1/users/me/members/:id',
  method: 'DELETE',
  goodResponses: [GoodMemberDelete],
  badResponses: [BadEnded, BadEndpoint, BadToken],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
})

export const SetEmailRoute = defineRoute({
  path: '/v1/users/me/auth/email',
  method: 'PUT',
  captchaAction: ProtectedAction.SetEmail,
  body: z.object({
    email: UserEmail,
    recaptchaCode: z.optional(z.string()),
  }),
  goodResponses: [GoodEmailSet, GoodVerifySent],
  badResponses: [
    BadEmail,
    BadKnownEmail,
    BadEmailChangeDivision,
    BadUnknownUser,
    BadRecaptchaCode,
    BadToken,
  ],
  authRequired: true,
})

export const DeleteEmailRoute = defineRoute({
  path: '/v1/users/me/auth/email',
  method: 'DELETE',
  goodResponses: [GoodEmailRemoved],
  badResponses: [
    BadEndpoint,
    BadZeroAuth,
    BadEmailNoExists,
    BadUnknownUser,
    BadToken,
  ],
  authRequired: true,
})

export const SetCtftimeRoute = defineRoute({
  path: '/v1/users/me/auth/ctftime',
  method: 'PUT',
  body: z.object({
    ctftimeToken: z.string(),
  }),
  goodResponses: [GoodCtftimeAuthSet],
  badResponses: [
    BadEndpoint,
    BadCtftimeToken,
    BadKnownCtftimeId,
    BadUnknownUser,
    BadToken,
  ],
  authRequired: true,
})

export const DeleteCtftimeRoute = defineRoute({
  path: '/v1/users/me/auth/ctftime',
  method: 'DELETE',
  goodResponses: [GoodCtftimeRemoved],
  badResponses: [
    BadEndpoint,
    BadZeroAuth,
    BadCtftimeNoExists,
    BadUnknownUser,
    BadToken,
  ],
  authRequired: true,
})
