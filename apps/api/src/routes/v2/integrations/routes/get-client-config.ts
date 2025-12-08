import { config } from '@rctf/config'
import { GetClientConfigRouteV2, ProtectedAction } from '@rctf/types'
import { captchaProvider } from '../../../../providers'
import integrationsGroup from '../group'

integrationsGroup.route(GetClientConfigRouteV2, async ({ res }) => {
  return res.goodClientConfig({
    meta: config.meta,
    homeContent: config.homeContent,
    sponsors: config.sponsors,
    ctfName: config.ctfName,
    divisions: config.divisions,
    defaultDivision: config.defaultDivision ?? null,
    origin: config.origin,
    startTime: config.startTime,
    endTime: config.endTime,
    userMembers: config.userMembers,
    emailEnabled: Boolean(config.email),
    globalSiteTag: config.globalSiteTag ?? null,
    faviconUrl: config.faviconUrl ?? null,
    registrationsEnabled: config.registrationsEnabled ?? null,
    ctftime: config.ctftime ?? null,
    instancerEnabled: Boolean(config.instancerProvider),
    captcha: captchaProvider
      ? {
          provider: config.captcha!.provider!.name,
          publicOptions: captchaProvider.getPublicOptions(),
          protectedEndpoints: Object.fromEntries(
            Object.values(ProtectedAction).map(action => [
              action,
              config.captcha!.protectedEndpoints?.includes(action) ?? false,
            ])
          ) as Record<ProtectedAction, boolean>,
        }
      : null,
  })
})
