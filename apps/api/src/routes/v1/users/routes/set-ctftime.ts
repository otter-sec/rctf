import { config } from '@rctf/config'
import { SetCtftimeRoute } from '@rctf/types'
import { parseToken, TokenKind } from '../../../../lib/tokens'
import { updateCtftimeId } from '../../../../services/users'
import usersGroup from '../group'

usersGroup.route(SetCtftimeRoute, async ({ ctx, user, res, body }) => {
  if (!config.ctftime) {
    return res.badEndpoint()
  }

  const ctftimeData = await parseToken(TokenKind.CtftimeAuth, body.ctftimeToken)
  if (ctftimeData === null) {
    return res.badCtftimeToken()
  }

  return await updateCtftimeId(res, ctx.var.db, user.id, ctftimeData.ctftimeId)
})
