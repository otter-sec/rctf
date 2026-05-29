import { z } from 'zod/mini'
import { defineRoute } from '../../internal'
import {
  BadExternalAuthRequest,
  BadToken,
  GoodExternalAuthAuthorize,
  GoodExternalAuthClient,
  GoodExternalAuthToken,
} from '../../responses'

const ClientIdParam = z.object({
  id: z.string().check(z.describe('Public client id.')),
})

export const GetExternalAuthClientRouteV2 = defineRoute({
  path: '/v2/external-auth/clients/:id',
  method: 'GET',
  goodResponses: [GoodExternalAuthClient],
  badResponses: [BadExternalAuthRequest],
  authRequired: false,
  params: ClientIdParam,
})

export const AuthorizeExternalAuthRouteV2 = defineRoute({
  path: '/v2/external-auth/authorize',
  method: 'POST',
  goodResponses: [GoodExternalAuthAuthorize],
  badResponses: [BadExternalAuthRequest, BadToken],
  authRequired: true,
  body: z.object({
    clientId: z.string(),
    redirectUri: z.string(),
    state: z.optional(z.string()),
  }),
})

export const ExternalAuthTokenRouteV2 = defineRoute({
  path: '/v2/external-auth/token',
  method: 'POST',
  goodResponses: [GoodExternalAuthToken],
  badResponses: [BadExternalAuthRequest],
  authRequired: false,
  body: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    code: z.string(),
  }),
})
