import { GetExternalAuthClientRouteV2 } from '@rctf/types'
import { getExternalAuthClientPublic } from '../../../../services/external-auth'
import externalAuthGroup from '../group'

externalAuthGroup.route(
  GetExternalAuthClientRouteV2,
  async ({ ctx, res, params }) => {
    const client = await getExternalAuthClientPublic(ctx.var.db, params.id)
    if (!client) {
      return res.badExternalAuthRequest()
    }
    return res.goodExternalAuthClient(client)
  }
)
