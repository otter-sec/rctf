import { config } from '@rctf/config'
import { ChallengeScoringKind, GetChallengesRouteV2 } from '@rctf/types'
import { getChallenges } from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(GetChallengesRouteV2, async ({ res, ctx, user }) => {
  const challenges = await getChallenges(ctx.var.db, user?.id)

  return res.goodChallengesV2(
    challenges.map(item => ({
      id: item.id,
      ...item.data,
      files: item.data.files.map(file => ({
        name: file.name,
        url: file.url,
        size: file.size ?? null,
      })),
      points: item.score ?? 0,
      solves: item.solveCount ?? 0,
      sortWeight: item.data.sortWeight ?? null,
      tags: item.data.tags ?? null,
      instancerLifetime: Boolean(config.instancerProvider)
        ? (item.data.instancerConfig?.timeoutMilliseconds ?? null)
        : null,
      instancerExtendable: item.data.instancerConfig?.extendable !== false,
      adminBotInputs: item.data.adminBotConfig?.inputs ?? null,
      hasFlag: Boolean(item.data.flag),
      scoringKind: item.data.scoring?.kind ?? ChallengeScoringKind.DECAY,
      yourScore: item.myScore,
      yourPointDelta: item.myPointDelta,
    }))
  )
})
