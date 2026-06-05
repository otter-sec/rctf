import { CompleteAdminUserVerificationRouteV2 } from '@rctf/types'
import { completePendingTeamVerification } from '../../../../services/admin-verifications'
import adminGroup from '../group'

adminGroup.route(
  CompleteAdminUserVerificationRouteV2,
  async ({ res, ctx, params }) => {
    const result = await completePendingTeamVerification(ctx.var.db, params.id)

    if (!result.success) {
      if (result.error === 'badKnownEmail') {
        return res.badKnownEmail()
      }
      if (result.error === 'badKnownName') {
        return res.badKnownName()
      }
      return res.badUnknownVerification()
    }

    return res.goodAdminUserVerificationCompleteV2({ userId: result.userId })
  }
)
