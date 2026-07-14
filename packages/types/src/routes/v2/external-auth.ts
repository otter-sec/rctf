import { z } from 'zod/mini'
import { defineRoute } from '../../internal'
import {
  BadBody,
  BadExternalAuthRequest,
  BadPerms,
  BadToken,
  GoodExternalAuthAuthorize,
  GoodExternalAuthClient,
  GoodExternalAuthToken,
} from '../../responses'
import { HttpUrl } from '../../util/types'

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
  badResponses: [BadBody, BadExternalAuthRequest, BadPerms, BadToken],
  authRequired: true,
  rejectBanned: true,
  body: z.object({
    clientId: z.string().check(z.describe('Public client ID.')),
    redirectUri: HttpUrl.check(
      z.describe('HTTP(S) redirect URI; must match the client registration.')
    ),
    state: z
      .optional(z.string())
      .check(z.describe('Opaque value echoed back on redirect.')),
  }),
})

export const ExternalAuthTokenRouteV2 = defineRoute({
  path: '/v2/external-auth/token',
  method: 'POST',
  goodResponses: [GoodExternalAuthToken],
  badResponses: [BadExternalAuthRequest],
  authRequired: false,
  body: z.object({
    clientId: z.string().check(z.describe('Public client ID.')),
    clientSecret: z.string().check(z.describe('Client secret.')),
    code: z
      .string()
      .check(
        z.describe('Authorization code returned from the authorize step.')
      ),
  }),
})
