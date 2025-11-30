import { z } from 'zod'
import { response } from '../internal'

const SolveSchema = z.object({
  category: z.string(),
  name: z.string(),
  points: z.number().int().nullable(),
  solves: z.number().int().nullable(),
  id: z.string(),
  createdAt: z.number().int(),
})

export const GoodUserSelfDataV2 = response('goodUserSelfData', {
  status: 200,
  message: "The user's own data was successfully retrieved.",
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    ctftimeId: z.string().nullish(),
    division: z.string(),
    score: z.number().int(),
    globalPlace: z.number().int().nullable(),
    divisionPlace: z.number().int().nullable(),
    solves: z.array(SolveSchema),
    teamToken: z.string(),
    allowedDivisions: z.array(z.string()),
    perms: z.number().int().nullable(),
    avatarUrl: z.string().nullable(),
  }),
})
