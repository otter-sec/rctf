import { GetAdminChallengeSolvesRouteV2 } from '@rctf/types'
import { getChallengeSolvesResponse } from '../../../../services/challenge-solves'
import adminGroup from '../group'

adminGroup.route(
  GetAdminChallengeSolvesRouteV2,
  ({ res, ctx, params, query, user }) =>
    getChallengeSolvesResponse({
      res,
      db: ctx.var.db,
      challengeId: params.id,
      userId: user.id,
      limit: query.limit,
      offset: query.offset,
      includeHidden: true,
    })
)
