import { GetFlagProvidersRouteV2 } from '@rctf/types'
import { z } from 'zod/mini'
import {
  DEFAULT_FLAG_PROVIDER,
  flagProviders,
} from '../../../../providers/flags'
import adminGroup from '../group'

adminGroup.route(GetFlagProvidersRouteV2, async ({ res }) => {
  return res.goodFlagProviders({
    defaultProvider: DEFAULT_FLAG_PROVIDER,
    providers: Object.entries(flagProviders).map(([name, provider]) => ({
      name,
      schema: z.toJSONSchema(provider.configSchema),
    })),
  })
})
