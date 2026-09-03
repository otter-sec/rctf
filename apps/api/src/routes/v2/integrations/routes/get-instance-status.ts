import { GetInstanceStatusRouteV2 } from '@rctf/types'
import { getInstanceStatus } from '../../../../services/instance-lifecycle'
import integrationsGroup from '../group'

integrationsGroup.route(
  GetInstanceStatusRouteV2,
  ({ ctx, res, params, user }) =>
    getInstanceStatus({ res, db: ctx.var.db, user, challengeId: params.id })
)
