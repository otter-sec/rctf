import { UpdateAdminSettingsRouteV2 } from '@rctf/types'
import {
  getCompetitionTimingValidationError,
  getConfigDefaults,
  getSettings,
  patchSettings,
  updateSettings,
} from '../../../../services/settings'
import { forceLeaderboardUpdate } from '../../../../workers'
import adminGroup from '../group'

adminGroup.route(UpdateAdminSettingsRouteV2, async ({ res, ctx, body }) => {
  const changesTiming = 'startTime' in body.data || 'endTime' in body.data
  if (changesTiming) {
    const current = await getSettings(ctx.var.db)
    const patched = patchSettings(current, body.data)
    const timingError = getCompetitionTimingValidationError(patched)
    if (timingError !== null) {
      return res.badBody({ reason: timingError })
    }
  }

  const overrides = await updateSettings(ctx.var.db, body.data)
  const defaults = getConfigDefaults()
  if (changesTiming) {
    forceLeaderboardUpdate()
  }

  return res.goodAdminSettingsUpdate({ overrides, defaults })
})
