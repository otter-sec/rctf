import { config } from '@rctf/config'
import { GetClientConfigRoute } from '@rctf/types'
import integrationsGroup from '../group'

integrationsGroup.route(GetClientConfigRoute, async ({ res }) => {
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
