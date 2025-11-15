import { GetAdminChallengesRoute } from '@rctf/types'
import { getChallenges } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengesRoute, async ({ res, ctx }) => {
  const data = await getChallenges(ctx.var.db)
  return res.goodAdminChallenges(
    data.map(item => {
      return {
        id: item.id,
        ...item.data,
      }
    })
  )
})
