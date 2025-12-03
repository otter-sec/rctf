import {
  CreateInstanceRouteV2,
  DeleteInstanceRouteV2,
  GetInstanceStatusRouteV2,
} from '@rctf/types'
import { instancerProvider } from '../../../../providers'
import {
  getInstancerChallenge,
  returnInstanceStatusOrError,
} from '../../../../services/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  DeleteInstanceRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    const instanceStatus = await instancerProvider!.deleteInstance({
      teamId: user.id,
      ...challenge.data.instancerConfig!,
    })

    return await returnInstanceStatusOrError(res, instanceStatus)
  }
)
