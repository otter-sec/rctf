import { GetAdminChallengesRouteV2 } from '@rctf/types'
import { getPrivateChallenges } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengesRouteV2, async ({ res, ctx }) => {
  const data = await getPrivateChallenges(ctx.var.db)
  return res.goodAdminChallenges(
    data.map(item => ({
      id: item.id,
      ...item.data,
      files: item.data.files.map(file => ({
        ...file,
        size: file.size ?? null,
      })),
      sortWeight: item.data.sortWeight ?? null,
      remotes: item.data.remotes ?? [],
      instancerConfig: item.data.instancerConfig ?? null,
      adminBotConfig: item.data.adminBotConfig ?? null,
      hidden: item.data.hidden ?? false,
    }))
  )
})
