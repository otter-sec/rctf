import { DeleteAdminInstanceRouteV2 } from '@rctf/types'
import { deleteInstance } from '../../../../services/instance-lifecycle'
import adminGroup from '../group'

adminGroup.route(DeleteAdminInstanceRouteV2, ({ ctx, res, params, user }) =>
  deleteInstance({
    res,
    db: ctx.var.db,
    user,
    challengeId: params.id,
    includeHidden: true,
  })
)
