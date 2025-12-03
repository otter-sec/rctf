import { z } from 'zod'
import { response } from '../internal'
import { EndpointSchema, InstanceStatus } from '../util'

export const GoodInstanceStatus = response('goodInstanceStatus', {
  status: 200,
  message: 'The instance status was retrieved.',
  data: z.object({
    status: z.nativeEnum(InstanceStatus),
    timeLeftMilliseconds: z.number().int().nullable(),
    endpoints: z.array(EndpointSchema).nullable(),
  }),
})
