import { z } from 'zod'

import { response } from '../dsl'

const SolveSchema = z.object({
  category: z.string(),
  name: z.string(),
  points: z.number().int().nullable(),
  solves: z.number().int().nullable(),
  id: z.string(),
  createdAt: z.number().int(),
})

export const GoodUserSelfData = response('goodUserSelfData', {
  status: 200,
  message: "The user's own data was successfully retrieved.",
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    ctftimeId: z.string().optional(),
    division: z.string(),
    score: z.number().int(),
    globalPlace: z.number().int().nullable(),
    divisionPlace: z.number().int().nullable(),
    solves: z.array(SolveSchema),
    teamToken: z.string(),
    allowedDivisions: z.array(z.string()),
    perms: z.number().int().optional(),
  }),
})
