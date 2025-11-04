import { z } from 'zod'

import { model } from '../dsl'

export const InUser = model('InUser', {
  id: z.number(),
  name: z.string().min(1).max(64),
})
