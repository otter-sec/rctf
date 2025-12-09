import { GetVerifyInfoRouteV2 } from '@rctf/types'
import { parseTokenWithMultipleKinds, TokenKind } from '../../../../lib/tokens'
import authGroup from '../group'
import { getUser, getUserByEmail } from '../../../../services/users'

authGroup.route(GetVerifyInfoRouteV2, async ({ ctx, query, res }) => {
  const result = await parseTokenWithMultipleKinds(
    [TokenKind.Verify, TokenKind.Team],
    query.token
  )
  if (!result) {
    return res.badTokenVerification()
  }

  const [kind, data] = result

  if (kind === TokenKind.Verify && data.kind === 'register') {
    return res.goodVerifyInfo({
      kind: 'register',
      email: data.email,
      name: data.name,
    })
  }

  if (kind === TokenKind.Verify && data.kind === 'update') {
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
