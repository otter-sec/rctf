import { z } from 'zod/mini'
import { response } from '../internal'

const JsonSchemaSchema = z.record(z.string(), z.unknown())
export const GoodInstancerSchema = response('goodInstancerSchema', {
  status: 200,
  message: 'The instancer configuration schema was retrieved successfully.',
  data: z.object({
    schema: JsonSchemaSchema,
    defaults: z.record(z.string(), z.unknown()),
  }),
})
