import { UpdateAdminSettingsRouteV2 } from '@rctf/types'
import {
  getConfigDefaults,
  updateSettings,
} from '../../../../services/settings'
import adminGroup from '../group'

adminGroup.route(UpdateAdminSettingsRouteV2, async ({ res, ctx, body }) => {
  const result = await updateSettings(ctx.var.db, body.data)
  if (!result.ok) {
    return res.badBody({ reason: result.reason })
  }

  const defaults = getConfigDefaults()
  return res.goodAdminSettingsUpdate({ overrides: result.settings, defaults })
})
