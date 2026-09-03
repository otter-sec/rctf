import { RunInstanceActionRouteV2 } from '@rctf/types'
import { runInstanceAction } from '../../../../services/instance-lifecycle'
import integrationsGroup from '../group'

integrationsGroup.route(
  RunInstanceActionRouteV2,
  ({ ctx, res, params, user }) =>
    runInstanceAction({
      res,
      db: ctx.var.db,
      redis: ctx.var.redis,
      user,
      challengeId: params.id,
      actionId: params.action,
    })
)
