import { z } from 'zod'
import { model } from '../dsl'

export const CtftimeCallbackBody = model('CtftimeCallbackBody', {
  ctftimeCode: z.string(),
})
