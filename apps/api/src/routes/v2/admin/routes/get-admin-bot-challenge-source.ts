import { GetAdminBotChallengeSourceRouteV2 } from '@rctf/types'
import { getPrivateChallenge } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(
  GetAdminBotChallengeSourceRouteV2,
  async ({ ctx, res, params }) => {
    const challenge = await getPrivateChallenge(ctx.var.db, params.id)
    if (!challenge?.data.adminBotConfig) {
      return res.badEndpoint()
    }

    return res.goodAdminBotChallengeSource({
      sourceCode: challenge.data.adminBotConfig.code,
      configRevision: challenge.data.adminBotConfig.revision,
    })
  }
)
