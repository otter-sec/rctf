import { GetChallengesRoute } from '@rctf/types'
import { getChallengeDynamicPointsValue } from '../../../../cache/leaderboard'
import { getPublicChallenges } from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(GetChallengesRoute, async ({ res, ctx }) => {
  const challenges = await getPublicChallenges(ctx.var.db)
  const scores = await getChallengeDynamicPointsValue(
    ctx.var.redis,
    challenges.map(item => item.id)
  )

  return res.goodChallenges(
    challenges.map((item, index) => {
      return {
        id: item.id,
        ...item.data,
        points: scores[index]?.score ?? 0,
        solves: scores[index]?.solves ?? 0,
        sortWeight: item.data.sortWeight ?? null,
      }
    })
  )
})
