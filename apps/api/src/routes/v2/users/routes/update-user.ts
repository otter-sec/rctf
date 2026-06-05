import { UpdateUserRouteV2 } from '@rctf/types'
import { rateLimitUpdateProfile } from '../../../../services/rate-limit'
import { updateUserInternal } from '../../../../services/users'
import { divisionAllowed } from '../../../../util/acl'
import usersGroup from '../group'

usersGroup.route(UpdateUserRouteV2, async ({ ctx, user, res, body }) => {
  if (
    body.division !== undefined &&
    !divisionAllowed(user.email, body.division)
  ) {
    return res.badDivisionNotAllowed()
  }

  const timeLeft = await rateLimitUpdateProfile(ctx.var.redis, user.id)
  if (timeLeft) {
    return res.badRateLimit({ timeLeft })
  }

  const result = await updateUserInternal(ctx.var.db, ctx.var.redis, user, {
    division: body.division ?? user.division,
    name: body.name ?? user.name,
    countryCode:
      body.countryCode !== undefined ? body.countryCode : user.countryCode,
    statusText:
      body.statusText !== undefined ? body.statusText : user.statusText,
  })

  if (!result.success) {
    if (result.error === 'badDivisionChangeEnded') {
      return res.badDivisionChangeEnded()
    }

    return res.badKnownName()
  }

  return res.goodUserUpdateV2({
    user: {
      name: result.user.name,
      email: result.user.email ?? null,
      division: result.user.division,
      avatarUrl: result.user.avatarUrl ?? null,
      countryCode: result.user.countryCode ?? null,
      statusText: result.user.statusText ?? null,
    },
  })
})
