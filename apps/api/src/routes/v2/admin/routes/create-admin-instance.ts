import { CreateAdminInstanceRouteV2 } from '@rctf/types'
import { createInstance } from '../../../../services/instance-lifecycle'
import adminGroup from '../group'

adminGroup.route(CreateAdminInstanceRouteV2, ({ ctx, res, params, user }) =>
  createInstance({
    res,
    db: ctx.var.db,
    user,
    challengeId: params.id,
    includeHidden: true,
  })
)
