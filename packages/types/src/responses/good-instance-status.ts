import { z } from 'zod/mini'
import { response } from '../internal'
import { EndpointSchema, InstanceStatus } from '../util'
import { example } from '../util/example'

export const GoodInstanceStatus = response('goodInstanceStatus', {
  status: 200,
  message: 'The instance status was retrieved.',
  data: z.object({
    status: example(z.enum(InstanceStatus), 'running').check(
      z.describe('Current lifecycle state of the instance.')
    ),
    timeLeftMilliseconds: example(z.nullable(z.int()), 600000).check(
      z.describe('Milliseconds until expiry, or `null` when not running.')
    ),
    endpoints: z.nullable(z.array(EndpointSchema)),
  }),
})
