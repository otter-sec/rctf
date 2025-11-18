import { z } from 'zod'
import { defineRoute } from '../internal'
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
} from '../responses'
import { UserEmail, UserName } from '../util'

export const GetUserRoute = defineRoute({
  path: '/v1/users/:id',
  method: 'GET',
  responses: [GoodUserData, BadUnknownUser],
  authRequired: false,
  params: z.object({
    id: z.string(),
  }),
})

export const GetUserSelfRoute = defineRoute({
  path: '/v1/users/me',
  method: 'GET',
  responses: [GoodUserSelfData],
  authRequired: true,
})

export const UpdateUserRoute = defineRoute({
  path: '/v1/users/me',
  method: 'PATCH',
  body: z.object({
    name: UserName.optional(),
    division: z.string().optional(),
  }),
  responses: [
    GoodUserUpdate,
    BadEnded,
    BadName,
    BadRateLimit,
    BadDivisionNotAllowed,
    BadKnownName,
  ],
  authRequired: true,
})

export const GetMembersRoute = defineRoute({
  path: '/v1/users/me/members',
  method: 'GET',
  responses: [GoodMemberData, BadEndpoint],
  authRequired: true,
})

export const CreateMemberRoute = defineRoute({
  path: '/v1/users/me/members',
  method: 'POST',
  body: z.object({
    email: UserEmail,
  }),
  responses: [GoodMemberCreate, BadEndpoint, BadEnded, BadEmail, BadKnownEmail],
  authRequired: true,
})

export const DeleteMemberRoute = defineRoute({
  path: '/v1/users/me/members/:id',
  method: 'DELETE',
  responses: [GoodMemberDelete, BadEnded, BadEndpoint],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
})

export const SetEmailRoute = defineRoute({
  path: '/v1/users/me/auth/email',
  method: 'PUT',
  body: z.object({
    email: UserEmail,
  }),
  responses: [
    GoodEmailSet,
    GoodVerifySent,
    BadEmail,
    BadKnownEmail,
    BadEmailChangeDivision,
    BadUnknownUser,
  ],
  authRequired: true,
})

export const DeleteEmailRoute = defineRoute({
  path: '/v1/users/me/auth/email',
  method: 'DELETE',
  responses: [
    GoodEmailRemoved,
    BadEndpoint,
    BadZeroAuth,
    BadEmailNoExists,
    BadUnknownUser,
  ],
  authRequired: true,
})

export const SetCtftimeRoute = defineRoute({
  path: '/v1/users/me/auth/ctftime',
  method: 'PUT',
  body: z.object({
    ctftimeToken: z.string(),
  }),
  responses: [
    GoodCtftimeAuthSet,
    BadEndpoint,
    BadCtftimeToken,
    BadKnownCtftimeId,
    BadUnknownUser,
  ],
  authRequired: true,
})

export const DeleteCtftimeRoute = defineRoute({
  path: '/v1/users/me/auth/ctftime',
  method: 'DELETE',
  responses: [
    GoodCtftimeRemoved,
    BadEndpoint,
    BadZeroAuth,
    BadCtftimeNoExists,
    BadUnknownUser,
  ],
  authRequired: true,
})
