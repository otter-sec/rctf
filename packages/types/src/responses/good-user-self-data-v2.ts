import { z } from 'zod/mini'
import { response } from '../internal'

const SolveSchema = z.object({
  category: z.string(),
  name: z.string(),
  points: z.nullable(z.int()),
  awardedPoints: z.nullable(z.int()),
  solves: z.nullable(z.int()),
  id: z.string(),
  createdAt: z.int(),
  bloodIndex: z.nullable(z.int()),
})

const DynamicScoreSchema = z.object({
  id: z.string(),
  points: z.int(),
  pointDelta: z.int(),
})

export const GoodUserSelfDataV2 = response('goodUserSelfDataV2', {
  status: 200,
  message: "The user's own data was successfully retrieved.",
  data: z.object({
    id: z.string(),
    name: z.string(),
    email: z.nullable(z.string()),
    ctftimeId: z.nullish(z.string()),
    division: z.string(),
    score: z.int(),
    globalPlace: z.nullable(z.int()),
    divisionPlace: z.nullable(z.int()),
    solves: z.array(SolveSchema),
    dynamicScores: z.array(DynamicScoreSchema),
    teamToken: z.string(),
    allowedDivisions: z.array(z.string()),
    perms: z.nullable(z.int()),
    avatarUrl: z.nullable(z.string()),
    countryCode: z.nullable(z.string()),
    statusText: z.nullable(z.string()),
  }),
})
