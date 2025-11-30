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

export const GoodUserDataV2 = response('goodUserData', {
  status: 200,
  message: 'The user data was successfully retrieved.',
  data: z.object({
    name: z.string(),
    ctftimeId: z.string().nullish(),
    division: z.string(),
    score: z.number().int(),
    globalPlace: z.number().int().nullable(),
    divisionPlace: z.number().int().nullable(),
    solves: z.array(SolveSchema),
    avatarUrl: z.string().nullable(),
  }),
})
