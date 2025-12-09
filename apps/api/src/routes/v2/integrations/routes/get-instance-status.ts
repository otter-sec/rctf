import { GetInstanceStatusRouteV2 } from '@rctf/types'
import { instancerProvider } from '../../../../providers'
import {
  filterInstanceEndpoints,
  getInstancerChallenge,
  returnInstanceStatusOrError,
} from '../../../../services/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  GetInstanceStatusRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    let instanceStatus = await instancerProvider!.getInstance({
      teamId: user.id,
      challengeIntegrationId:
        challenge.data.instancerConfig!.challengeIntegrationId,
    })

    return await returnInstanceStatusOrError(
      res,
      filterInstanceEndpoints(instanceStatus, challenge)
    )
  }
)
