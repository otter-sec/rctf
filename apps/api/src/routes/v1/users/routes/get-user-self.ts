import { GetUserSelfRoute } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import { getUserChallengeSolves } from '../../../../services/challenges'
import { allowedDivisions } from '../../../../util/acl'
import usersGroup from '../group'

usersGroup.route(GetUserSelfRoute, async ({ ctx, user, res }) => {
  const [teamToken, solves] = await Promise.all([
    createToken(TokenKind.Team, user.id),
    getUserChallengeSolves(ctx.var.db, user.id),
  ])
  const allowedDivs = allowedDivisions({
    email: user.email,
    defaultOnly: false,
  }) as string[]

  return res.goodUserSelfData({
    id: user.id,
    name: user.name,
    email: user.email ?? undefined,
    ctftimeId: user.ctftimeId ?? undefined,
    division: user.division,
    score: 4_200, // TODO(es3n1n): scores
    globalPlace: 1,
    divisionPlace: 1,
    solves: solves.map(item => ({
      id: item.solve.challengeid,
      createdAt: new Date(item.solve.createdat).getTime(),
      name: item.challengeData.name,
      category: item.challengeData.category,
      solves: item.challengeSolves,
      points: 100, // TODO(es3n1n): scores
    })),
    teamToken: teamToken,
    allowedDivisions: allowedDivs,
    perms: user.perms,
  })
})
