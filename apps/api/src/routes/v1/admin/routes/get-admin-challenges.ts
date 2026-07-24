import { GetAdminChallengesRoute } from '@rctf/types'
import { getFirstDefaultFlag } from '../../../../providers/flags'
import { getPrivateChallenges } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengesRoute, async ({ res, ctx }) => {
  const data = await getPrivateChallenges(ctx.var.db)
  return res.goodAdminChallenges(
    data.map(item => {
      return {
        id: item.id,
        ...item.data,
        flag: getFirstDefaultFlag(item.data.flags),
        sortWeight: item.data.sortWeight ?? null,
      }
    })
  )
})
