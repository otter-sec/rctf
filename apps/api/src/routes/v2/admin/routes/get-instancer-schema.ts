import { config } from '@rctf/config'
import { GetInstancerSchemaRouteV2 } from '@rctf/types'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { instancerProvider } from '../../../../providers'
import adminGroup from '../group'

adminGroup.route(GetInstancerSchemaRouteV2, async ({ res }) => {
  if (!config.instancerProvider || !instancerProvider) {
    return res.badEndpoint()
  }

  const jsonSchema = zodToJsonSchema(instancerProvider.configSchema, {
    name: 'InstancerConfig',
    $refStrategy: 'none',
  })

  return res.goodInstancerSchema({
    schema: jsonSchema,
    defaults: instancerProvider.getDefaults(),
  })
})
