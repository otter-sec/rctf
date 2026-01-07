import { GetAdminUsersRouteV2 } from '@rctf/types'
import { getAllUsersWithScores } from '../../../../services/users'
import adminGroup from '../group'

adminGroup.route(
  GetAdminUsersRouteV2,
  async ({ ctx, res, query: { limit, offset } }) => {
    const { total, users } = await getAllUsersWithScores(
      ctx.var.db,
      ctx.var.redis,
      limit,
      offset
    )

    return res.goodAdminUsers({
      total,
      users,
    })
  }
)
