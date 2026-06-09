import { z } from 'zod/mini'
import { response } from '../internal'
import { omitWhenNull } from '../util'

const SolveSchema = z.object({
  category: z.string(),
  name: z.string(),
  points: z.nullable(z.int()),
  solves: z.nullable(z.int()),
  id: z.string(),
  createdAt: z.int(),
})

export const GoodUserSelfData = response('goodUserSelfData', {
  status: 200,
  message: "The user's own data was successfully retrieved.",
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: omitWhenNull(z.string()),
    ctftimeId: omitWhenNull(z.string()),
    division: z.string(),
    score: z.int(),
    globalPlace: z.nullable(z.int()),
    divisionPlace: z.nullable(z.int()),
    solves: z.array(SolveSchema),
    teamToken: z.string(),
    allowedDivisions: z.array(z.string()),
    perms: z.nullable(z.int()),
  }),
})
