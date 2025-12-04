import { EndpointSchema, GetInstanceStatusRouteV2 } from '@rctf/types'
import type z from 'zod'
import { instancerProvider } from '../../../../providers'
import type { instanceDetailsSchema } from '../../../../providers/instancer/base'
import {
  getInstancerChallenge,
  returnInstanceStatusOrError,
} from '../../../../services/instancer'
import integrationsGroup from '../group'

integrationsGroup.route(
  GetInstanceStatusRouteV2,
  async ({ ctx, res, params, user }) => {
    const { challenge, error } = await getInstancerChallenge(
      res,
      ctx.var.db,
      params.id
    )
    if (error) {
      return error
    }

    let instanceStatus = (await instancerProvider!.getInstance({
      teamId: user.id,
      ...challenge.data.instancerConfig!,
    })) as z.output<typeof instanceDetailsSchema>

    // NOTE(es3n1n): Providers are guaranteed to return endpoints in the same order as the expose config
    if (instanceStatus.endpoints && challenge.data.instancerConfig?.expose) {
      instanceStatus.endpoints =
        (instanceStatus.endpoints
          .map((endpoint, i) => {
            if (!challenge.data.instancerConfig?.expose?.[i]?.shouldDisplay) {
              return undefined
            }

            return endpoint
          })
          .filter(endpoint => Boolean(endpoint)) as z.output<
          typeof EndpointSchema
        >[]) ?? null
    }

    return await returnInstanceStatusOrError(res, instanceStatus)
  }
)
