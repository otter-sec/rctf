import { UpdateAdminSettingsRouteV2 } from '@rctf/types'
import {
  getConfigDefaults,
  updateSettings,
} from '../../../../services/settings'
import adminGroup from '../group'

adminGroup.route(UpdateAdminSettingsRouteV2, async ({ res, ctx, body }) => {
  const overrides = await updateSettings(ctx.var.db, body.data)
  const defaults = getConfigDefaults()
  return res.goodAdminSettingsUpdate({ overrides, defaults })
})
