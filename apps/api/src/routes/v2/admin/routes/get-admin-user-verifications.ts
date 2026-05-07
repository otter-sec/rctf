import { GetAdminUserVerificationsRouteV2 } from '@rctf/types'
import { getPendingTeamVerifications } from '../../../../services/admin-verifications'
import adminGroup from '../group'

adminGroup.route(
  GetAdminUserVerificationsRouteV2,
  async ({ res, ctx, query }) => {
    const result = await getPendingTeamVerifications(ctx.var.redis, {
      limit: query.limit,
      offset: query.offset,
    })

    return res.goodAdminUserVerifications({
      total: result.total,
      verifications: result.verifications.map(verification => ({
        id: verification.verifyId,
        name: verification.name,
        email: verification.email,
        division: verification.division,
        createdAt: verification.createdAt,
        expiresAt: verification.expiresAt,
      })),
    })
  }
)
