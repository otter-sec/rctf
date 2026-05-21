import { DynamicScoresMode, SubmitDynamicScoresRouteV2 } from '@rctf/types'
import { upsertDynamicSolves } from '../../../../services/solve-points'
import { forceLeaderboardUpdate } from '../../../../workers'
import challsGroup from '../group'

challsGroup.route(SubmitDynamicScoresRouteV2, async ({ res, ctx, body }) => {
  const challenge = ctx.var.dynamicChallenge!
  const mode = body.mode ?? DynamicScoresMode.REPLACEMENT

  const result = await upsertDynamicSolves(
    ctx.var.db,
    challenge.id,
    body.scores.map(s => ({ userId: s.userId, points: s.points })),
    { mode }
  )

  forceLeaderboardUpdate(ctx.var.redis)
  return res.goodDynamicScores({
    inserted: result.inserted,
    updated: result.updated,
    deleted: result.deleted,
  })
})
