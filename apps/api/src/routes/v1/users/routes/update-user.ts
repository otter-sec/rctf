import { UpdateUserRoute } from '@rctf/types'
import { rateLimitUpdateProfile } from '../../../../services/rate-limit'
import { updateUserInternal } from '../../../../services/users'
import { divisionAllowed } from '../../../../util/acl'
import usersGroup from '../group'

usersGroup.route(UpdateUserRoute, async ({ ctx, user, res, body }) => {
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
  })

  if (!result.success) {
    if (result.error === 'badDivisionChangeEnded') {
      return res.badBody({
        reason: 'Division cannot be changed after the CTF has ended',
      })
    }

    return res.badKnownName()
  }

  return res.goodUserUpdate({
    user: {
      name: result.user.name,
      email: result.user.email ?? null,
      division: result.user.division,
    },
  })
})
