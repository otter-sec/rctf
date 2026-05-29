import { CreateExternalAuthClientRouteV2 } from '@rctf/types'
import { createExternalAuthClient } from '../../../../services/external-auth'
import adminGroup from '../group'

adminGroup.route(
  CreateExternalAuthClientRouteV2,
  async ({ ctx, res, body, user }) => {
    const { client, secret } = await createExternalAuthClient(ctx.var.db, {
      name: body.name,
      redirectUri: body.redirectUri,
      createdBy: user.id,
    })
    return res.goodAdminExternalAuthClientCreate({ ...client, secret })
  }
)
