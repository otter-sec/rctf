import { GetUserSelfRoute } from '@rctf/types'
import {
  getChallengeDynamicPointsValue,
  getUserScore,
} from '../../../../cache/leaderboard'
import { createToken, TokenKind } from '../../../../lib/tokens'
import { getUserChallengeSolves } from '../../../../services/challenges'
import { allowedDivisions } from '../../../../util/acl'
import usersGroup from '../group'

usersGroup.route(GetUserSelfRoute, async ({ ctx, user, res }) => {
  const [teamToken, solves, userScore] = await Promise.all([
    createToken(TokenKind.Team, user.id),
    getUserChallengeSolves(ctx.var.db, user.id),
    getUserScore(ctx.var.redis, user.id),
  ])
  const challengeScores = await getChallengeDynamicPointsValue(
    ctx.var.redis,
    solves.map(item => item.solve.challengeid)
  )
  const allowedDivs = allowedDivisions({
    email: user.email,
    defaultOnly: false,
  }) as string[]

  return res.goodUserSelfData({
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    ctftimeId: user.ctftimeId ?? null,
    division: user.division,
    score: userScore.score ?? 0,
    globalPlace: userScore.place ?? null,
    divisionPlace: userScore.divisionPlace ?? null,
    solves: solves.map((item, index) => ({
      id: item.solve.challengeid,
      createdAt: new Date(item.solve.createdat).getTime(),
      name: item.challengeData.name,
      category: item.challengeData.category,
      solves: challengeScores[index]?.solves ?? null,
      points: challengeScores[index]?.score ?? null,
    })),
    teamToken: teamToken,
    allowedDivisions: allowedDivs,
    perms: user.perms,
  })
})
