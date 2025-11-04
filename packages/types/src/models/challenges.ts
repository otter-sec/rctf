import { z } from 'zod'
import { model } from '../dsl'

export const SubmitFlagBody = model('SubmitFlagBody', {
  flag: z.string(),
})
