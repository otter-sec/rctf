import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

const JsonSchemaSchema = z.record(z.string(), z.unknown())
export const GoodInstancerSchema = response('goodInstancerSchema', {
  status: 200,
  message: 'The instancer configuration schemas were retrieved successfully.',
  data: z.object({
    defaultInstancer: example(z.string(), 'kubernetes').check(
      z.describe('Name of the instancer used by default.')
    ),
    instancers: z.array(
      z.object({
        name: example(z.string(), 'kubernetes').check(
          z.describe('Instancer name.')
        ),
        schema: example(JsonSchemaSchema, { type: 'object' }).check(
          z.describe('JSON Schema describing the instancer config fields.')
        ),
        defaults: example(z.record(z.string(), z.unknown()), {}).check(
          z.describe('Default config values for the instancer.')
        ),
        canStop: example(z.boolean(), true).check(
          z.describe('Whether instances can be stopped.')
        ),
        canExtend: example(z.boolean(), true).check(
          z.describe('Whether instance lifetimes can be extended.')
        ),
        actions: z
          .array(
            z.object({
              id: example(z.string(), 'restart').check(
                z.describe(
                  'Stable action identifier sent back to the instancer.'
                )
              ),
              label: example(z.string(), 'Restart').check(
                z.describe('Button label shown for the action.')
              ),
            })
          )
          .check(z.describe('Provider-defined instancer actions.')),
      })
    ),
  }),
})
