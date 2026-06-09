import { GetAdminChallengeRoute } from '@rctf/types'
import { getPrivateChallenge } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengeRoute, async ({ res, ctx, params }) => {
  const data = await getPrivateChallenge(ctx.var.db, params.id)
  if (!data) {
    return res.badChallenge()
  }

  return res.goodAdminChallenge({
    id: data.id,
    ...data.data,
  })
})
