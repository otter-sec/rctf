import { z } from 'zod/mini'
import { defineRoute } from '../../internal'
import {
  BadExtAuthRequest,
  BadToken,
  GoodExtAuthAuthorize,
  GoodExtAuthClient,
  GoodExtAuthToken,
} from '../../responses'

const ClientIdParam = z.object({
  id: z.string().check(z.describe('Public client id.')),
})

export const GetExtAuthClientRouteV2 = defineRoute({
  path: '/v2/ext-auth/clients/:id',
  method: 'GET',
  goodResponses: [GoodExtAuthClient],
  badResponses: [BadExtAuthRequest],
  authRequired: false,
  params: ClientIdParam,
})

export const AuthorizeExtAuthRouteV2 = defineRoute({
  path: '/v2/ext-auth/authorize',
  method: 'POST',
  goodResponses: [GoodExtAuthAuthorize],
  badResponses: [BadExtAuthRequest, BadToken],
  authRequired: true,
  body: z.object({
    clientId: z.string(),
    redirectUri: z.string(),
    state: z.optional(z.string()),
  }),
})

export const ExtAuthTokenRouteV2 = defineRoute({
  path: '/v2/ext-auth/token',
  method: 'POST',
  goodResponses: [GoodExtAuthToken],
  badResponses: [BadExtAuthRequest],
  authRequired: false,
  body: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    code: z.string(),
  }),
})
