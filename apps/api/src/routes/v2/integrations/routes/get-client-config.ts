import { config } from '@rctf/config'
import { GetClientConfigRouteV2, ProtectedAction } from '@rctf/types'
import { captchaProvider } from '../../../../providers'
import { getSettings, resolveSettings } from '../../../../services/settings'
import integrationsGroup from '../group'

const getAnalyticsConfig = () => {
  if (config.analytics?.provider) {
    return {
      provider: config.analytics.provider.name,
      publicOptions: (config.analytics.provider.options ?? {}) as Record<
        string,
        string
      >,
    }
  }

  if (config.globalSiteTag) {
    return {
      provider: 'analytics/google',
      publicOptions: { siteTag: config.globalSiteTag },
    }
  }

  return null
}

integrationsGroup.route(GetClientConfigRouteV2, async ({ res, ctx }) => {
  const dbSettings = await getSettings(ctx.var.db)
  const resolved = resolveSettings(dbSettings)
  return res.goodClientConfig({
    ...resolved,
    flagFormatPlaceholder: config.flagFormatPlaceholder,
    divisions: config.divisions,
    defaultDivision: config.defaultDivision ?? null,
    origin: config.origin,
    startTime: config.startTime,
    endTime: config.endTime,
    userMembers: config.userMembers,
    emailEnabled: Boolean(config.email),
    analytics: getAnalyticsConfig(),
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
