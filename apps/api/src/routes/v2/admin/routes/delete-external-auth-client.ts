import { DeleteExternalAuthClientRouteV2 } from '@rctf/types'
import { deleteExternalAuthClient } from '../../../../services/external-auth'
import adminGroup from '../group'

adminGroup.route(DeleteExternalAuthClientRouteV2, async ({ ctx, res, params }) => {
  const ok = await deleteExternalAuthClient(ctx.var.db, params.id)
  if (!ok) {
    return res.badExternalAuthRequest()
  }
  return res.goodAdminExternalAuthClientDelete()
})
