import { ChallengeScoringKind, GetChallengesRouteV2 } from '@rctf/types'
import { instancerEnabled } from '../../../../providers'
import { getChallenges } from '../../../../services/challenges'
import {
  resolveInstancerActions,
  resolveInstancerCapabilities,
} from '../../../../services/instancer'
import challsGroup from '../group'

challsGroup.route(GetChallengesRouteV2, async ({ res, ctx, user }) => {
  const challenges = await getChallenges(ctx.var.db, user?.id)

  return res.goodChallengesV2(
    challenges.map(item => {
      const instancerConfig = item.data.instancerConfig
      const capabilities = instancerConfig
        ? resolveInstancerCapabilities(instancerConfig)
        : null

      return {
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
        instancerLifetime: instancerEnabled
          ? (instancerConfig?.timeoutMilliseconds ?? null)
          : null,
        instancerExtendable:
          instancerConfig?.extendable !== false &&
          (capabilities?.canExtend ?? true),
        instancerStoppable: capabilities?.canStop ?? true,
        instancerActions: instancerConfig
          ? resolveInstancerActions(instancerConfig)
          : [],
        adminBotInputs: item.data.adminBotConfig?.inputs ?? null,
        hasFlag: Boolean(item.data.flag || item.data.flags?.dynamic),
        scoringKind: item.data.scoring?.kind ?? ChallengeScoringKind.DECAY,
        yourScore: item.myScore,
        yourPointDelta: item.myPointDelta,
      }
    })
  )
})
