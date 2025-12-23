import { z } from 'zod/mini'
import { response } from '../internal'

const SolveSchema = z.object({
  category: z.string(),
  name: z.string(),
  points: z.nullable(z.int()),
  solves: z.nullable(z.int()),
  id: z.string(),
  createdAt: z.int(),
  bloodIndex: z.nullable(z.int()),
})

export const GoodUserDataV2 = response('goodUserData', {
  status: 200,
  message: 'The user data was successfully retrieved.',
  data: z.object({
    name: z.string(),
    ctftimeId: z.nullish(z.string()),
    division: z.string(),
    score: z.int(),
    globalPlace: z.nullable(z.int()),
    divisionPlace: z.nullable(z.int()),
    solves: z.array(SolveSchema),
    avatarUrl: z.nullable(z.string()),
    countryCode: z.nullable(z.string()),
    statusText: z.nullable(z.string()),
  }),
})
