import { GetAdminChallengeRouteV2 } from '@rctf/types'
import { getPrivateChallenge } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengeRouteV2, async ({ res, ctx, params }) => {
  const data = await getPrivateChallenge(ctx.var.db, params.id)
  if (!data) {
    return res.badChallenge()
  }

  return res.goodAdminChallenge({
    id: data.id,
    ...data.data,
    files: data.data.files.map(file => ({
      ...file,
      size: file.size ?? null,
    })),
    sortWeight: data.data.sortWeight ?? null,
    remotes: data.data.remotes ?? [],
    instancerConfig: data.data.instancerConfig ?? null,
    adminBotConfig: data.data.adminBotConfig ?? null,
    hidden: data.data.hidden ?? false,
  })
})
