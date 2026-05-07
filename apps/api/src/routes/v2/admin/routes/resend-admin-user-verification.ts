import { ResendAdminUserVerificationRouteV2 } from '@rctf/types'
import { resendPendingTeamVerification } from '../../../../services/admin-verifications'
import adminGroup from '../group'

adminGroup.route(
  ResendAdminUserVerificationRouteV2,
  async ({ res, ctx, params }) => {
    const result = await resendPendingTeamVerification(ctx.var.redis, params.id)

    if (!result.success) {
      if (result.error === 'badEndpoint') {
        return res.badEndpoint()
      }
      return res.badUnknownVerification()
    }

    return res.goodAdminUserVerificationResend({
      verificationId: result.verificationId,
    })
  }
)
