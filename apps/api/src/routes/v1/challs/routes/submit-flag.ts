import { SubmitFlagRoute } from '@rctf/types'
import { submitFlag } from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(SubmitFlagRoute, async ({ res, ctx, params, body, user }) => {
  return await submitFlag(res, ctx.var.db, ctx.var.redis, ctx.var.logger, {
    user,
    challengeId: params.id,
    flag: body.flag,
    submissionIp: ctx.var.ip,
  })
})
