import { z } from 'zod'
import { model } from '../internal'

export const SubmitFlagBody = model('SubmitFlagBody', {
  flag: z.string(),
})
