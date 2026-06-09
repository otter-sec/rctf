import { GetChallengesRoute } from '@rctf/types'
import { getChallenges } from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(GetChallengesRoute, async ({ res, ctx }) => {
  const challenges = await getChallenges(ctx.var.db)

  return res.goodChallenges(
    challenges.map(item => {
      return {
        id: item.id,
        ...item.data,
        points: item.score ?? undefined,
        solves: item.solveCount ?? undefined,
        sortWeight: item.data.sortWeight ?? null,
      }
    })
  )
})
