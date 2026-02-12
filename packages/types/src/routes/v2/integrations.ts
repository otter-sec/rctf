import { z } from 'zod/mini'
import { Permissions, ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadAdminBotConfig,
  BadCaptcha,
  BadChallenge,
  BadEndpoint,
  BadInstancerError,
  BadRateLimit,
  BadToken,
  ErrorInternal,
  GoodAdminBotConfig,
  GoodAdminBotJobStatus,
  GoodAdminBotJobSubmitted,
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

export const GetAdminBotConfigRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/admin-bot/config',
  method: 'GET',
  goodResponses: [GoodAdminBotConfig],
  badResponses: [BadEndpoint, BadChallenge, BadToken],
  authRequired: false,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const GetAdminBotJobStatusRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/admin-bot/status',
  method: 'GET',
  goodResponses: [GoodAdminBotJobStatus],
  badResponses: [BadEndpoint, BadChallenge, BadToken],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const SubmitAdminBotJobRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/admin-bot',
  method: 'POST',
  body: z.object({
    inputs: z.record(
      z.string().check(z.maxLength(256)),
      z.string().check(z.maxLength(1024))
    ),
  }),
  goodResponses: [GoodAdminBotJobSubmitted],
  badResponses: [
    BadAdminBotConfig,
    BadEndpoint,
    BadChallenge,
    BadRateLimit,
    BadToken,
  ],
  authRequired: true,
  params: z.object({
    id: z.string(),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})
