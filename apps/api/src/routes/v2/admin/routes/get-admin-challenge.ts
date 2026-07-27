import { GetAdminChallengeRouteV2 } from '@rctf/types'
import {
  getChallengeSolveCount,
  getPrivateChallenge,
} from '../../../../services/challenges'
import adminGroup from '../group'

adminGroup.route(GetAdminChallengeRouteV2, async ({ res, ctx, params }) => {
  const [data, solveCount] = await Promise.all([
    getPrivateChallenge(ctx.var.db, params.id),
    getChallengeSolveCount(ctx.var.db, params.id),
  ])
  if (!data) {
    return res.badChallenge()
  }

  return res.goodAdminChallengeV2({
    id: data.id,
    ...data.data,
    files: data.data.files.map(file => ({
      ...file,
      size: file.size ?? null,
    })),
    flags: data.data.flags ?? [],
    sortWeight: data.data.sortWeight ?? null,
    tags: data.data.tags ?? null,
    instancerConfig: data.data.instancerConfig ?? null,
    adminBotConfig: data.data.adminBotConfig ?? null,
    hidden: data.data.hidden ?? false,
    solveCount,
  })
})
