import { ListExtAuthClientsRouteV2 } from '@rctf/types'
import { listExtAuthClients } from '../../../../services/ext-auth'
import adminGroup from '../group'

adminGroup.route(ListExtAuthClientsRouteV2, async ({ ctx, res }) => {
  const clients = await listExtAuthClients(ctx.var.db)
  return res.goodAdminExtAuthClients(clients)
})
