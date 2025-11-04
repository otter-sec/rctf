import { z } from 'zod'

import { model } from '../dsl'

export const OutUser = model('OutUser', {
  id: z.number(),
  name: z.string().min(1).max(64),
  code: z.number().int().min(0),
})
