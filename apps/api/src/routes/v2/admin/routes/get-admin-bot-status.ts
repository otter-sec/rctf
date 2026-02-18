import { GetAdminBotStatusRouteV2 } from '@rctf/types'
import { adminBotProvider } from '../../../../providers'
import adminGroup from '../group'

adminGroup.route(GetAdminBotStatusRouteV2, async ({ res }) => {
  if (!adminBotProvider) {
    return res.badEndpoint()
  }

  return res.goodAdminBotStatus({
    enabled: true,
    configLanguage: adminBotProvider.configLanguage,
  })
})
