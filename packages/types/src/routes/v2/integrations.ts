import { z } from 'zod/mini'
import { Permissions, ProtectedAction } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadAdminBotConfig,
  BadCaptcha,
  BadChallenge,
  BadEndpoint,
  BadInstancerError,
  BadInstancerState,
  BadPerms,
  BadRateLimit,
  BadToken,
  ErrorInternal,
  GoodAdminBotConfig,
  GoodAdminBotJobHistory,
  GoodAdminBotJobLogs,
  GoodAdminBotJobStatus,
  GoodAdminBotJobSubmitted,
  GoodClientConfigV2,
  GoodInstancerActionResult,
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
  badResponses: [
    BadInstancerError,
    BadEndpoint,
    BadChallenge,
    BadPerms,
    ErrorInternal,
  ],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const CreateInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'PUT',
  captchaAction: ProtectedAction.InstancerStart,
  body: z.object({
    captchaCode: z
      .optional(z.string())
      .check(z.describe('Checked only when captcha protects this route.')),
  }),
  goodResponses: [GoodInstanceStatus],
  badResponses: [
    BadInstancerError,
    BadEndpoint,
    BadChallenge,
    BadCaptcha,
    BadPerms,
  ],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const DeleteInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'DELETE',
  goodResponses: [GoodInstanceStatus],
  badResponses: [BadInstancerError, BadEndpoint, BadChallenge, BadPerms],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const ExtendInstanceRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance',
  method: 'PATCH',
  captchaAction: ProtectedAction.InstancerExtend,
  body: z.object({
    captchaCode: z
      .optional(z.string())
      .check(z.describe('Checked only when captcha protects this route.')),
  }),
  goodResponses: [GoodInstanceStatus],
  badResponses: [
    BadInstancerError,
    BadEndpoint,
    BadChallenge,
    BadCaptcha,
    BadPerms,
  ],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const RunInstanceActionRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/instance/actions/:action',
  method: 'POST',
  goodResponses: [GoodInstancerActionResult],
  badResponses: [
    BadInstancerError,
    BadEndpoint,
    BadChallenge,
    BadRateLimit,
    BadPerms,
  ],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
    action: z.string().check(z.describe('Instancer action name.')),
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
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const GetAdminBotJobStatusRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/admin-bot/status',
  method: 'GET',
  goodResponses: [GoodAdminBotJobStatus],
  badResponses: [BadEndpoint, BadChallenge, BadToken, BadPerms],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const GetAdminBotJobHistoryRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/admin-bot/history',
  method: 'GET',
  goodResponses: [GoodAdminBotJobHistory],
  badResponses: [BadEndpoint, BadChallenge, BadToken, BadPerms],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const GetAdminBotJobLogsRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/admin-bot/jobs/:jobId/logs',
  method: 'GET',
  goodResponses: [GoodAdminBotJobLogs],
  badResponses: [BadEndpoint, BadChallenge, BadToken, BadPerms],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
    jobId: z.string().check(z.describe('Admin-bot job ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const SubmitAdminBotJobRouteV2 = defineRoute({
  path: '/v2/integrations/challs/:id/admin-bot',
  method: 'POST',
  captchaAction: ProtectedAction.AdminBotSubmit,
  body: z.object({
    inputs: z
      .record(
        z.string().check(z.maxLength(256)),
        z.string().check(z.maxLength(1024))
      )
      .check(
        z.describe('Admin-bot input values keyed by the config field name.')
      ),
    captchaCode: z
      .optional(z.string())
      .check(z.describe('Checked only when captcha protects this route.')),
  }),
  goodResponses: [GoodAdminBotJobSubmitted],
  badResponses: [
    BadAdminBotConfig,
    BadCaptcha,
    BadInstancerState,
    BadEndpoint,
    BadChallenge,
    BadRateLimit,
    BadPerms,
    BadToken,
  ],
  authRequired: true,
  rejectBanned: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})
