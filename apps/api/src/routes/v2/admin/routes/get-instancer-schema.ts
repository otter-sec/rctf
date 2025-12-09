import { config } from '@rctf/config'
import { GetInstancerSchemaRouteV2 } from '@rctf/types'
import { z } from 'zod/mini'
import { instancerProvider } from '../../../../providers'
import adminGroup from '../group'

adminGroup.route(GetInstancerSchemaRouteV2, async ({ res }) => {
  if (!config.instancerProvider || !instancerProvider) {
    return res.badEndpoint()
  }

  return res.goodInstancerSchema({
    schema: z.toJSONSchema(instancerProvider.configSchema),
    defaults: instancerProvider.getDefaults(),
  })
})
