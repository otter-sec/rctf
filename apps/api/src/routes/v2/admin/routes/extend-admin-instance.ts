import { ExtendAdminInstanceRouteV2 } from '@rctf/types'
import { extendInstance } from '../../../../services/instance-lifecycle'
import adminGroup from '../group'

adminGroup.route(ExtendAdminInstanceRouteV2, ({ ctx, res, params, user }) =>
  extendInstance({
    res,
    db: ctx.var.db,
    user,
    challengeId: params.id,
    includeHidden: true,
  })
)
