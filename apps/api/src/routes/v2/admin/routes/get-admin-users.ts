import { GetAdminUsersRouteV2 } from '@rctf/types'
import { getAllUsersWithScores } from '../../../../services/users'
import adminGroup from '../group'

adminGroup.route(
  GetAdminUsersRouteV2,
  async ({ ctx, res, query: { limit, offset } }) => {
    return res.goodAdminUsers(
      await getAllUsersWithScores(ctx.var.db, ctx.var.redis, limit, offset)
    )
  }
)
