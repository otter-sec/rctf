import { config } from '@rctf/config'
import { GetClientConfigRoute } from '@rctf/types'
import integrationsGroup from '../group'

integrationsGroup.route(GetClientConfigRoute, async ({ res }) => {
  return res.goodClientConfig({
    ...config,
    emailEnabled: Boolean(config.email),
  })
})
