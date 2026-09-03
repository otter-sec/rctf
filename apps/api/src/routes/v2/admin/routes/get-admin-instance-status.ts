import { GetAdminInstanceStatusRouteV2 } from '@rctf/types'
import { getInstanceStatus } from '../../../../services/instance-lifecycle'
import adminGroup from '../group'

adminGroup.route(GetAdminInstanceStatusRouteV2, ({ ctx, res, params, user }) =>
  getInstanceStatus({
    res,
    db: ctx.var.db,
    user,
    challengeId: params.id,
    includeHidden: true,
  })
)
