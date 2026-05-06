import { UpdateAdminSettingsRouteV2 } from '@rctf/types'
import {
  getConfigDefaults,
  updateSettings,
} from '../../../../services/settings'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateAdminSettingsRouteV2, async ({ res, ctx, body }) => {
  const result = await updateSettings(ctx.var.db, body.data, ctx.var.redis)
  if (!result.ok) {
    return res.badBody({ reason: result.reason })
  }

  const defaults = getConfigDefaults()
  if (result.changedTiming) {
    forceLeaderboardUpdate()
  }

  return res.goodAdminSettingsUpdate({ overrides: result.settings, defaults })
})
