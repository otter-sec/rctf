import { ListExternalAuthClientsRouteV2 } from '@rctf/types'
import { listExternalAuthClients } from '../../../../services/external-auth'
import adminGroup from '../group'

adminGroup.route(ListExternalAuthClientsRouteV2, async ({ ctx, res }) => {
  const clients = await listExternalAuthClients(ctx.var.db)
  return res.goodAdminExternalAuthClients(clients)
})
