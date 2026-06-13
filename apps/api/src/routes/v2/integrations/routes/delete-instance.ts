import { DeleteInstanceRouteV2 } from '@rctf/types'
import {
  filterInstanceEndpoints,
  getInstancerChallenge,
  returnInstanceStatusOrError,
} from '../../../../services/instancer'
import { inferChallengeIntegrationId } from '../../../../util/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  DeleteInstanceRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, provider, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    if (!provider.capabilities.canStop) {
      return res.badInstancerError({
        message: 'Stopping is disabled for this instancer',
      })
    }

    const instanceStatus = await provider.deleteInstance({
      teamId: user.id,
      challengeIntegrationId: inferChallengeIntegrationId(challenge),
    })

    return await returnInstanceStatusOrError(
      res,
      filterInstanceEndpoints(instanceStatus, challenge)
    )
  }
)
