import { config } from '@rctf/config'
import { GetClientConfigRoute } from '@rctf/types'
import { getResolvedSettings } from '../../../../services/settings'
import integrationsGroup from '../group'

integrationsGroup.route(GetClientConfigRoute, async ({ res, ctx }) => {
  const resolved = await getResolvedSettings(ctx.var.db, ctx.var.redis)
  return res.goodClientConfig({
    ...resolved,
    divisions: config.divisions,
    defaultDivision: config.defaultDivision ?? null,
    origin: config.origin,
    userMembers: config.userMembers,
    emailEnabled: Boolean(config.email),
    globalSiteTag: config.globalSiteTag ?? null,
    registrationsEnabled: config.registrationsEnabled ?? null,
    ctftime: config.ctftime ?? null,
    recaptcha:
      config.captcha?.provider?.name === 'captcha/recaptcha'
        ? {
            siteKey:
              (config.captcha!.provider!.options as { siteKey?: string })
                .siteKey ?? '',
            protectedActions: config.captcha!.protectedEndpoints ?? [],
          }
        : null,
  })
})
