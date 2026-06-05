import { config } from '@rctf/config'
import { GetChallengeScoresRouteV2 } from '@rctf/types'
import {
  getChallengeScoresGraph,
  getChallengeScoresWithPosition,
} from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(
  GetChallengeScoresRouteV2,
  async ({ res, ctx, params, query, user }) => {
    // NOTE: Handling manually because the values are loaded from config
    if (
      query.limit > config.leaderboard.maxLimit ||
      query.offset > config.leaderboard.maxOffset
    ) {
      return res.badBody({
        reason: 'Invalid limit or offset',
      })
    }

    const { challengeExists, scores, total, myPosition } =
      await getChallengeScoresWithPosition(
        ctx.var.db,
        params.id,
        user?.id ?? null,
        query.limit,
        query.offset
      )

    if (!challengeExists) {
      return res.badChallenge()
    }

    // always include the caller's series when they have a score
    const graphUserIds = scores.map(score => score.userId)
    if (user?.id && myPosition !== null && !graphUserIds.includes(user.id)) {
      graphUserIds.push(user.id)
    }

    const graph = await getChallengeScoresGraph(
      ctx.var.db,
      params.id,
      graphUserIds
    )

    return res.goodChallengeScoresV2({ total, myPosition, scores, graph })
  }
)
