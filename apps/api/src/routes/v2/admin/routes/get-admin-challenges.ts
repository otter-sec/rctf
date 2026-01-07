import { GetAdminChallengesRouteV2 } from '@rctf/types'
import { getChallenges } from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengesRouteV2, async ({ res, ctx }) => {
  const data = await getChallenges(ctx.var.db)
  return res.goodAdminChallenges(
    data.map(item => ({
      id: item.id,
      ...item.data,
      files: item.data.files.map(file => ({
        name: file.name,
        url: file.url,
        size: file.size ?? null,
      })),
      sortWeight: item.data.sortWeight ?? null,
      instancerConfig: item.data.instancerConfig ?? null,
      hidden: item.data.hidden ?? false,
    }))
  )
})
