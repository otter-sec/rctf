import { z } from 'zod/mini'
import { Permissions, ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadCaptcha,
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
  goodResponses: [GoodClientConfigV2],
  authRequired: false,
})

export const GetInstanceStatusRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'GET',
  goodResponses: [GoodInstanceStatus],
  badResponses: [BadInstancerError, BadEndpoint, BadChallenge, ErrorInternal],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const CreateInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'PUT',
  captchaAction: ProtectedAction.InstancerStart,
  body: z.object({
    captchaCode: z.optional(z.string()),
  }),
  goodResponses: [GoodInstanceStatus],
  badResponses: [BadInstancerError, BadEndpoint, BadChallenge, BadCaptcha],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const DeleteInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'DELETE',
  goodResponses: [GoodInstanceStatus],
  badResponses: [BadInstancerError, BadEndpoint, BadChallenge],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const ExtendInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'PATCH',
  captchaAction: ProtectedAction.InstancerExtend,
  body: z.object({
    captchaCode: z.optional(z.string()),
  }),
  goodResponses: [GoodInstanceStatus],
  badResponses: [BadInstancerError, BadEndpoint, BadChallenge, BadCaptcha],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})
