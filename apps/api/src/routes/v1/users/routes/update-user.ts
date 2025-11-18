import { UpdateUserRoute } from '@rctf/types'
import { rateLimit } from '../../../../services/rate-limit'
import { updateUser } from '../../../../services/users'
import { divisionAllowed } from '../../../../util/acl'
import usersGroup from '../group'

usersGroup.route(UpdateUserRoute, async ({ ctx, user, res, body }) => {
  if (
    body.division !== undefined &&
    user.email &&
    !divisionAllowed(user.email, body.division)
  ) {
    return res.badDivisionNotAllowed()
  }

  // Limit name updates to 1 per 10 minutes
  if (body.name !== undefined) {
    const timeLeft = await rateLimit(
      ctx.var.redis,
      `rl:UPDATE_PROFILE:${user.id}`,
      1,
      10 * 60 * 1000
    )

    if (timeLeft) {
      return res.badRateLimit({ timeLeft })
    }
  }

  return await updateUser(res, ctx.var.db, user.id, {
    division: body.division ?? user.division,
    name: body.name ?? user.name,
  })
})
