import { ExtendInstanceRouteV2 } from '@rctf/types'
import {
  filterInstanceEndpoints,
  getInstancerChallenge,
  returnInstanceStatusOrError,
} from '../../../../services/instancer'
import { inferChallengeIntegrationId } from '../../../../util/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  ExtendInstanceRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, provider, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    if (!provider.capabilities.canExtend) {
      return res.badInstancerError({
        message: 'Extending is disabled for this instancer',
      })
    }

    if (challenge.data.instancerConfig!.extendable === false) {
      return res.badInstancerError({
        message: 'Extending is disabled for this challenge',
      })
    }

    const instanceStatus = await provider.extendInstance({
      teamId: user.id,
      challengeIntegrationId: inferChallengeIntegrationId(challenge),
      timeoutMilliseconds: challenge.data.instancerConfig!.timeoutMilliseconds,
      config: challenge.data.instancerConfig!.config,
    })

    return await returnInstanceStatusOrError(
      res,
      filterInstanceEndpoints(instanceStatus, challenge)
    )
  }
)
