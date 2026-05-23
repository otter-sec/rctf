import { GetExtAuthClientRouteV2 } from '@rctf/types'
import { getExtAuthClientPublic } from '../../../../services/ext-auth'
import extAuthGroup from '../group'

extAuthGroup.route(GetExtAuthClientRouteV2, async ({ ctx, res, params }) => {
  const client = await getExtAuthClientPublic(ctx.var.db, params.id)
  if (!client) {
    return res.badExtAuthRequest()
  }
  return res.goodExtAuthClient(client)
})
