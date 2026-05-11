import { GetAdminUserVerificationsRouteV2 } from '@rctf/types'
import { getPendingTeamVerifications } from '../../../../services/admin-verifications'
import adminGroup from '../group'

adminGroup.route(GetAdminUserVerificationsRouteV2, async ({ res, ctx }) => {
  const verifications = await getPendingTeamVerifications(ctx.var.db)

  return res.goodAdminUserVerifications({
    verifications: verifications.map(verification => ({
      ...verification,
      createdAt: new Date(verification.createdAt).getTime(),
      expiresAt: new Date(verification.expiresAt).getTime(),
    })),
  })
})
