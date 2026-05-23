import { UpdateAdminSettingsRouteV2 } from '@rctf/types'
import {
  getConfigDefaults,
  updateSettings,
} from '../../../../services/settings'
import {
  forceLeaderboardUpdate,
  requestAllChallengesRecompute,
} from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateAdminSettingsRouteV2, async ({ res, ctx, body }) => {
  const overrides = await updateSettings(ctx.var.db, body.data, ctx.var.redis)
  if ('startTime' in body.data || 'endTime' in body.data) {
    requestAllChallengesRecompute(ctx.var.redis, 'algo-change')
    forceLeaderboardUpdate(ctx.var.redis)
  }
  const defaults = getConfigDefaults()
  return res.goodAdminSettingsUpdate({ overrides, defaults })
})
