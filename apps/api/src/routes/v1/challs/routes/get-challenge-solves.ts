import { GetChallengeSolvesRoute } from '@rctf/types'
import { getChallengeSolves } from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(
  GetChallengeSolvesRoute,
  async ({ res, ctx, params, query }) => {
    const data = await getChallengeSolves(
      ctx.var.db,
      params.id,
      query.limit,
      query.offset
    )
    return res.goodChallengeSolves({
      solves: data.map(item => {
        return {
          id: item.solve.id,
          createdAt: new Date(item.solve.createdat).getTime(),
          userId: item.solve.userid,
          userName: item.userName,
        }
      }),
    })
  }
)
