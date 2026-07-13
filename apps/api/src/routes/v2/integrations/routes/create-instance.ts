import { CreateInstanceRouteV2 } from '@rctf/types'
import {
  filterInstanceEndpoints,
  getInstancerChallenge,
  returnInstanceStatusOrError,
} from '../../../../services/instancer'
import { inferChallengeIntegrationId } from '../../../../util/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  CreateInstanceRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, provider, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    const instanceStatus = await provider.createInstance({
      user,
      ...challenge.data.instancerConfig!,
      challengeIntegrationId: inferChallengeIntegrationId(challenge),
    })

    return await returnInstanceStatusOrError(
      res,
      filterInstanceEndpoints(instanceStatus, challenge)
    )
  }
)
