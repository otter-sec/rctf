import { GetInstancerSchemaRouteV2 } from '@rctf/types'
import { z } from 'zod/mini'
import {
  defaultInstancerName,
  instancerEnabled,
  instancers,
} from '../../../../providers'
import adminGroup from '../group'

adminGroup.route(GetInstancerSchemaRouteV2, async ({ res }) => {
  if (!instancerEnabled || !defaultInstancerName) {
    return res.badEndpoint()
  }

  return res.goodInstancerSchema({
    defaultInstancer: defaultInstancerName,
    instancers: Object.entries(instancers).map(([name, provider]) => ({
      name,
      schema: z.toJSONSchema(provider.configSchema),
      defaults: provider.getDefaults(),
      canStop: provider.capabilities.canStop,
      canExtend: provider.capabilities.canExtend,
    })),
  })
})
