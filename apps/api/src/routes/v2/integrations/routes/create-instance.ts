import { CreateInstanceRouteV2, GetInstanceStatusRouteV2 } from '@rctf/types'
import { instancerProvider } from '../../../../providers'
import {
  filterInstanceEndpoints,
  getInstancerChallenge,
  returnInstanceStatusOrError,
} from '../../../../services/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  CreateInstanceRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    const instanceStatus = await instancerProvider!.createInstance({
      teamId: user.id,
      ...challenge.data.instancerConfig!,
    })

    return await returnInstanceStatusOrError(
      res,
      filterInstanceEndpoints(instanceStatus, challenge)
    )
  }
)
