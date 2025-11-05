import { z } from 'zod'
import { model } from '../internal'

export const CtftimeCallbackBody = model('CtftimeCallbackBody', {
  ctftimeCode: z.string(),
})
