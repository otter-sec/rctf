import { RunAdminInstanceActionRouteV2 } from '@rctf/types'
import { runInstanceAction } from '../../../../services/instance-lifecycle'
import adminGroup from '../group'

adminGroup.route(RunAdminInstanceActionRouteV2, ({ ctx, res, params, user }) =>
  runInstanceAction({
    res,
    db: ctx.var.db,
    redis: ctx.var.redis,
    user,
    challengeId: params.id,
    actionId: params.action,
    includeHidden: true,
  })
)
