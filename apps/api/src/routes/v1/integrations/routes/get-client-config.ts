import { config } from '@rctf/config'
import { GetClientConfigRoute } from '@rctf/types'
import {
  getCachedSettings,
  resolveSettings,
} from '../../../../services/settings'
import integrationsGroup from '../group'

integrationsGroup.route(GetClientConfigRoute, async ({ res, ctx }) => {
  const dbSettings = await getCachedSettings(ctx.var.db, ctx.var.redis)
  const resolved = resolveSettings(dbSettings)
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
