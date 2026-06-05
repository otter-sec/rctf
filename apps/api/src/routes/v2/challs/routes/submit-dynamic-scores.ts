import { SubmitDynamicScoresRouteV2 } from '@rctf/types'
import { bumpDynamicFeedVersion } from '../../../../cache/leaderboard'
import { upsertDynamicSolves } from '../../../../services/solve-points'
import { forceLeaderboardUpdate } from '../../../../workers'
import challsGroup from '../group'

challsGroup.route(SubmitDynamicScoresRouteV2, async ({ res, ctx, body }) => {
  const challenge = ctx.var.dynamicChallenge!

  const result = await upsertDynamicSolves(
    ctx.var.db,
    challenge.id,
    body.scores
  )

  await bumpDynamicFeedVersion(ctx.var.redis)
  forceLeaderboardUpdate(ctx.var.redis)
  return res.goodDynamicScores({
    inserted: result.inserted,
    updated: result.updated,
    deleted: result.deleted,
  })
})
