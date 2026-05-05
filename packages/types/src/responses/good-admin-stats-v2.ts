import { z } from 'zod/mini'
import { response } from '../internal'

export const GoodAdminStatsV2 = response('goodAdminStats', {
  status: 200,
  message: 'The admin statistics were retrieved.',
  data: z.object({
    teams: z.object({
      total: z.int(),
      active: z.int(),
      banned: z.int(),
      admins: z.int(),
      scored: z.int(),
    }),
    challenges: z.object({
      total: z.int(),
      visible: z.int(),
      hidden: z.int(),
      scheduled: z.int(),
      solved: z.int(),
      unsolved: z.int(),
    }),
    solves: z.object({
      total: z.int(),
      accepted: z.int(),
      scoreboard: z.int(),
      banned: z.int(),
      firstAt: z.nullable(z.string()),
      latestAt: z.nullable(z.string()),
    }),
    scores: z.object({
      total: z.int(),
      average: z.int(),
      highest: z.int(),
    }),
    topTeams: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        division: z.string(),
        score: z.int(),
        solveCount: z.int(),
        globalRank: z.int(),
      })
    ),
    topChallenges: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        score: z.int(),
        solveCount: z.int(),
      })
    ),
    categories: z.array(
      z.object({
        name: z.string(),
        challengeCount: z.int(),
        solveCount: z.int(),
      })
    ),
    recentSolves: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string(),
        userId: z.string(),
        userName: z.string(),
        challengeId: z.string(),
        challengeName: z.string(),
        challengeCategory: z.string(),
      })
    ),
  }),
})
