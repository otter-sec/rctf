import { z } from 'zod/mini'
import { response } from '../internal'
import { EndpointSchema, InstanceStatus } from '../util'

export const GoodInstanceStatus = response('goodInstanceStatus', {
  status: 200,
  message: 'The instance status was retrieved.',
  data: z.object({
    status: z.enum(InstanceStatus),
    timeLeftMilliseconds: z.nullable(z.int()),
    endpoints: z.nullable(z.array(EndpointSchema)),
  }),
})
