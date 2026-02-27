import { UpdateUserRoute } from '@rctf/types'
import { rateLimit } from '../../../../services/rate-limit'
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

  // Limit name updates to 1 per 10 minutes
  if (body.name !== undefined) {
    // burst 3, 1 per 1min
    const timeLeft = await rateLimit(
      ctx.var.redis,
      `rl:UPDATE_PROFILE:${user.id}`,
      3,
      180_000
    )

    if (timeLeft) {
      return res.badRateLimit({ timeLeft })
    }
  }

  const result = await updateUserInternal(ctx.var.db, ctx.var.redis, user.id, {
    division: body.division ?? user.division,
    name: body.name ?? user.name,
  })

  if (!result.success) {
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
