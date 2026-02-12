import { GetAdminBotConfigRouteV2 } from '@rctf/types'
import { adminBotProvider } from '../../../../providers'
import { getChallenge } from '../../../../services/challenges'
import integrationsGroup from '../group'

integrationsGroup.route(
  GetAdminBotConfigRouteV2,
  async ({ ctx, res, params }) => {
    if (!adminBotProvider) {
      return res.badEndpoint()
    }

    const challenge = await getChallenge(ctx.var.db, params.id)
    if (!challenge) {
      return res.badChallenge()
    }

    const adminBotConfig = challenge.data.adminBotConfig
    if (!adminBotConfig) {
      return res.badEndpoint()
    }

    return res.goodAdminBotConfig({
      sourceCode: adminBotConfig.code,
      fileExtension: adminBotProvider.configFileExtension,
    })
  }
)
