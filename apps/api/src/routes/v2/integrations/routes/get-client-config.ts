import { config, ProtectedAction } from '@rctf/config'
import { GetClientConfigRouteV2 } from '@rctf/types'
import { captchaProvider } from '../../../../providers'
import integrationsGroup from '../group'

integrationsGroup.route(GetClientConfigRouteV2, async ({ res }) => {
  return res.goodClientConfig({
    ...config,
    emailEnabled: Boolean(config.email),
    globalSiteTag: config.globalSiteTag ?? null,
    defaultDivision: config.defaultDivision ?? null,
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
              config.captcha!.protectedEndpoints?.[action] ?? false,
            ])
          ) as Record<ProtectedAction, boolean>,
        }
      : null,
  })
})
