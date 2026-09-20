import { SetPasswordRouteV2 } from '@rctf/types'
import {
  checkPassword,
  getUserCredentialsById,
  hashPassword,
  setUserPassword,
} from '../../../../services/passwords'
import { rateLimitSetPassword } from '../../../../services/rate-limit'
import usersGroup from '../group'

usersGroup.route(SetPasswordRouteV2, async ({ ctx, res, body, user }) => {
  const timeLeft = await rateLimitSetPassword(ctx.var.redis, user.id)
  if (timeLeft) {
    return res.badRateLimit({ timeLeft })
  }

  // A stolen auth token must not be enough to lock the owner out.
  if (user.hasPassword) {
    const credentials = await getUserCredentialsById(ctx.var.db, user.id)
    if (!credentials) {
      return res.badUnknownUser()
    }
    const ok = await checkPassword(
      body.currentPassword ?? '',
      credentials.passwordHash
    )
    if (!ok) {
      return res.badCredentials()
    }
  }

  const authToken = await setUserPassword(
    ctx.var.db,
    ctx.var.redis,
    user.id,
    await hashPassword(body.password)
  )
  if (!authToken) {
    return res.badUnknownUser()
  }

  return res.goodPasswordSet({ authToken })
})
