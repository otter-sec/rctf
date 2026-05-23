import { CreateExtAuthClientRouteV2 } from '@rctf/types'
import { createExtAuthClient } from '../../../../services/ext-auth'
import adminGroup from '../group'

adminGroup.route(
  CreateExtAuthClientRouteV2,
  async ({ ctx, res, body, user }) => {
    const { client, secret } = await createExtAuthClient(ctx.var.db, {
      name: body.name,
      redirectUri: body.redirectUri,
      createdBy: user.id,
    })
    return res.goodAdminExtAuthClientCreate({ ...client, secret })
  }
)
