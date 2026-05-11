import { GetVerifyInfoRouteV2 } from '@rctf/types'
import { hasLoginVerification } from '../../../../cache/auth-cache'
import { parseTokenWithMultipleKinds, TokenKind } from '../../../../lib/tokens'
import { getPendingRegistrationVerificationByToken } from '../../../../services/registration-verifications'
import { getUser, getUserByEmail } from '../../../../services/users'
import authGroup from '../group'

authGroup.route(GetVerifyInfoRouteV2, async ({ ctx, query, res }) => {
  const result = await parseTokenWithMultipleKinds(
    [TokenKind.Verify, TokenKind.Team],
    query.token
  )
  if (!result) {
    const pending = await getPendingRegistrationVerificationByToken(
      ctx.var.db,
      query.token
    )
    if (!pending) {
      return res.badTokenVerification()
    }

    return res.goodVerifyInfo({
      kind: 'register',
      email: pending.email,
      name: pending.name,
    })
  }

  const [kind, data] = result

  // tokens still need their one-time Redis marker.
  if (
    kind === TokenKind.Verify &&
    !(await hasLoginVerification(ctx.var.redis, data.verifyId))
  ) {
    return res.badTokenVerification()
  }

  if (kind === TokenKind.Verify) {
    const user = await getUserByEmail(ctx.var.db, data.email)
    return res.goodVerifyInfo({
      kind: 'update',
      email: data.email,
      name: user?.name,
    })
  }

  if (kind === TokenKind.Team) {
    const user = await getUser(ctx.var.db, data)
    return res.goodVerifyInfo({
      kind: 'team',
      email: null,
      name: user?.name,
    })
  }

  // should never happen
  return res.badTokenVerification()
})
