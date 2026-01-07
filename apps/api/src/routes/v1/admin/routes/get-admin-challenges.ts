import { GetAdminChallengesRoute } from '@rctf/types'
import { getPrivateChallenges } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengesRoute, async ({ res, ctx }) => {
  const data = await getPrivateChallenges(ctx.var.db)
  return res.goodAdminChallenges(
    data.map(item => {
      return {
        id: item.id,
        ...item.data,
        sortWeight: item.data.sortWeight ?? null,
      }
    })
  )
})
