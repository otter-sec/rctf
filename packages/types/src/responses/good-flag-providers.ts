import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

const JsonSchemaSchema = z.record(z.string(), z.unknown())
export const GoodFlagProviders = response('goodFlagProviders', {
  status: 200,
  message: 'The flag provider schemas were retrieved successfully.',
  data: z.object({
    defaultProvider: example(z.string(), 'flags/static').check(
      z.describe('Name of the provider used when a flag entry omits one.')
    ),
    providers: z.array(
      z.object({
        name: example(z.string(), 'flags/static').check(
          z.describe('Flag validation provider name.')
        ),
        schema: example(JsonSchemaSchema, { type: 'object' }).check(
          z.describe(
            'JSON Schema describing the provider `config` fields of a flag entry.'
          )
        ),
      })
    ),
  }),
})
