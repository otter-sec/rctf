import { ExtendInstanceRouteV2 } from '@rctf/types'
import { instancerProvider } from '../../../../providers'
import {
  filterInstanceEndpoints,
  getInstancerChallenge,
  returnInstanceStatusOrError,
} from '../../../../services/instancer'
import { inferChallengeIntegrationId } from '../../../../util/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  ExtendInstanceRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    if (challenge.data.instancerConfig!.extendable === false) {
      return res.badInstancerError({
        message: 'Extending is disabled for this challenge',
      })
    }

    const instanceStatus = await instancerProvider!.extendInstance({
      teamId: user.id,
      challengeIntegrationId: inferChallengeIntegrationId(challenge),
      timeoutMilliseconds: challenge.data.instancerConfig!.timeoutMilliseconds,
    })

    return await returnInstanceStatusOrError(
      res,
      filterInstanceEndpoints(instanceStatus, challenge)
    )
  }
)
