import { config } from '@rctf/config'
import { GetClientConfigRouteV2 } from '@rctf/types'
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
    discord: config.discord ?? null,
    instancerEnabled: Boolean(config.instancerProvider),
  })
})
