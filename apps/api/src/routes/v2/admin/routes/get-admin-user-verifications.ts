import { GetAdminUserVerificationsRouteV2 } from '@rctf/types'
import { getPendingTeamVerifications } from '../../../../services/admin-verifications'
import adminGroup from '../group'

adminGroup.route(GetAdminUserVerificationsRouteV2, async ({ res, ctx }) => {
  const verifications = await getPendingTeamVerifications(ctx.var.redis)

  return res.goodAdminUserVerifications({
    verifications: verifications.map(verification => ({
      id: verification.verifyId,
      name: verification.name,
      email: verification.email,
      division: verification.division,
      createdAt: verification.createdAt,
      expiresAt: verification.expiresAt,
    })),
  })
})
