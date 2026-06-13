import { z } from 'zod/mini'
import { response } from '../internal'

const JsonSchemaSchema = z.record(z.string(), z.unknown())
export const GoodInstancerSchema = response('goodInstancerSchema', {
  status: 200,
  message: 'The instancer configuration schemas were retrieved successfully.',
  data: z.object({
    defaultInstancer: z.string(),
    instancers: z.array(
      z.object({
        name: z.string(),
        schema: JsonSchemaSchema,
        defaults: z.record(z.string(), z.unknown()),
        canStop: z.boolean(),
        canExtend: z.boolean(),
      })
    ),
  }),
})
