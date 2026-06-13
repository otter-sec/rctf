import { RunInstanceActionRouteV2 } from '@rctf/types'
import { getInstancerChallenge } from '../../../../services/instancer'
import { rateLimitInstancerAction } from '../../../../services/rate-limit'
import { inferChallengeIntegrationId } from '../../../../util/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  RunInstanceActionRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, provider, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    const action = provider.actions?.find(a => a.id === params.action)
    if (!action || !provider.runAction) {
      return res.badInstancerError({ message: 'Unknown instancer action' })
    }

    if (action.rateLimit) {
      const timeLeft = await rateLimitInstancerAction(
        ctx.var.redis,
        user.id,
        params.id,
        action.id,
        action.rateLimit.burst,
        action.rateLimit.intervalMilliseconds
      )
      if (timeLeft !== undefined) {
        return res.badRateLimit({ timeLeft })
      }
    }

    const outcome = await provider.runAction(action.id, {
      teamId: user.id,
      challengeIntegrationId: inferChallengeIntegrationId(challenge),
      config: challenge.data.instancerConfig!.config,
    })

    if (outcome.kind === 'instancerError') {
      return res.badInstancerError(outcome)
    }

    return res.goodInstancerActionResult({
      message: outcome.message ?? null,
      submitFlag: outcome.submitFlag ?? null,
    })
  }
)
