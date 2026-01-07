import { GetAdminChallengeRouteV2 } from '@rctf/types'
import { getChallenge } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengeRouteV2, async ({ res, ctx, params }) => {
  const data = await getChallenge(ctx.var.db, params.id)
  if (!data) {
    return res.badChallenge()
  }

  return res.goodAdminChallenge({
    id: data.id,
    ...data.data,
    files: data.data.files.map(file => ({
      name: file.name,
      url: file.url,
      size: file.size ?? null,
    })),
    sortWeight: data.data.sortWeight ?? null,
    instancerConfig: data.data.instancerConfig ?? null,
    hidden: data.data.hidden ?? false,
  })
})
