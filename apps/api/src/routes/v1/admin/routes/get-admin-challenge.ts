import { GetAdminChallengeRoute } from '@rctf/types'
import { getChallenge } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengeRoute, async ({ res, ctx, params }) => {
  const data = await getChallenge(ctx.var.db, params.id)
  if (!data) {
    return res.badChallenge()
  }

  return res.goodAdminChallenge({
    id: data.id,
    ...data.data,
  })
})
