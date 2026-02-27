import { VerifyRoute } from '@rctf/types'
import { checkLoginVerification } from '../../../../cache/auth-cache'
import {
  createToken,
  parseTokenWithMultipleKinds,
  TokenKind,
} from '../../../../lib/tokens'
import {
  createUser,
  getUser,
  updateUserEmail,
} from '../../../../services/users'
import { divisionAllowed } from '../../../../util/acl'
import authGroup from '../group'

authGroup.route(VerifyRoute, async ({ ctx, body, res }) => {
  const result = await parseTokenWithMultipleKinds(
    [TokenKind.Verify, TokenKind.Team],
    body.verifyToken
  )
  if (!result) {
    return res.badTokenVerification()
  }

  const [kind, data] = result

  if (kind === TokenKind.Team) {
    const user = await getUser(ctx.var.db, data)
    if (!user) {
      return res.badUnknownUser()
    }
    const authToken = await createToken(TokenKind.Auth, user.id)
    return res.goodVerify({ authToken })
  }

  const tokenUnused = await checkLoginVerification(ctx.var.redis, data.verifyId)
  if (!tokenUnused) {
    return res.badTokenVerification()
  }

  if (data.kind === 'register') {
    return await createUser(res, ctx.var.db, {
      division: data.division,
      email: data.email,
      name: data.name,
      ctftimeId: null,
    })
  }

  if (data.kind === 'update') {
    const user = await getUser(ctx.var.db, data.userId)
    if (!user) {
      return res.badUnknownUser()
    }

    if (!divisionAllowed(data.email, user.division)) {
      return res.badEmailChangeDivision()
    }

    return await updateUserEmail(res, ctx.var.db, ctx.var.redis, data.userId, {
      email: data.email,
    })
  }

  throw new Error(`Unsupported kind: ${data}`)
})
