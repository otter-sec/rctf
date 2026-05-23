import { DeleteExtAuthClientRouteV2 } from '@rctf/types'
import { deleteExtAuthClient } from '../../../../services/ext-auth'
import adminGroup from '../group'

adminGroup.route(DeleteExtAuthClientRouteV2, async ({ ctx, res, params }) => {
  const ok = await deleteExtAuthClient(ctx.var.db, params.id)
  if (!ok) {
    return res.badExtAuthRequest()
  }
  return res.goodAdminExtAuthClientDelete()
})
