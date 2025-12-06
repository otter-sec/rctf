import { z } from 'zod'
import { defineRoute } from '../../internal'
import {
  BadChallenge,
  BadEndpoint,
  BadInstancerError,
  ErrorInternal,
  GoodClientConfigV2,
  GoodInstanceStatus,
} from '../../responses'

export const GetClientConfigRouteV2 = defineRoute({
  path: '/v2/integrations/client/config',
  method: 'GET',
  responses: [GoodClientConfigV2],
  authRequired: false,
})

export const GetInstanceStatusRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'GET',
  responses: [
    GoodInstanceStatus,
    BadInstancerError,
    BadEndpoint,
    BadChallenge,
    ErrorInternal,
  ],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
})

// TODO(es3n1n): add captcha
export const CreateInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'PUT',
  responses: [GoodInstanceStatus, BadInstancerError, BadEndpoint, BadChallenge],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
})

export const DeleteInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'DELETE',
  responses: [GoodInstanceStatus, BadInstancerError, BadEndpoint, BadChallenge],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
})

// TODO(es3n1n): add captcha
export const ExtendInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'PATCH',
  responses: [GoodInstanceStatus, BadInstancerError, BadEndpoint, BadChallenge],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
})
