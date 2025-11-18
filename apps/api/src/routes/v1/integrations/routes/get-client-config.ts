import { config } from '@rctf/config'
import { GetClientConfigRoute } from '@rctf/types'
import integrationsGroup from '../group'

integrationsGroup.route(GetClientConfigRoute, async ({ res }) => {
  return res.goodClientConfig({
    ...config,
    emailEnabled: Boolean(config.email),
    globalSiteTag: config.globalSiteTag ?? null,
    defaultDivision: config.defaultDivision ?? null,
    faviconUrl: config.faviconUrl ?? null,
    registrationsEnabled: config.registrationsEnabled ?? null,
    ctftime: config.ctftime ?? null,
  })
})
