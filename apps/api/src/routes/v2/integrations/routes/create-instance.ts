import { CreateInstanceRouteV2 } from '@rctf/types'
import { createInstance } from '../../../../services/instance-lifecycle'
import integrationsGroup from '../group'

integrationsGroup.route(CreateInstanceRouteV2, ({ ctx, res, params, user }) =>
  createInstance({ res, db: ctx.var.db, user, challengeId: params.id })
)
