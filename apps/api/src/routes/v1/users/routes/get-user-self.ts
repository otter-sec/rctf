import { GetUserSelfRoute } from '@rctf/types'
import { createToken, TokenKind } from '../../../../lib/tokens'
import { allowedDivisions } from '../../../../util/acl'
import usersGroup from '../group'

usersGroup.route(GetUserSelfRoute, async ({ user, res }) => {
  const teamToken = await createToken(TokenKind.Team, user.id)
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
    score: 4_200,
    globalPlace: 1,
    divisionPlace: 1,
    solves: [
      {
        category: 'misc',
        name: 'Warmup',
        points: 100,
        solves: 42,
        id: 'chal-1',
        createdAt: 1_700_000_000,
      },
    ],
    teamToken: teamToken,
    allowedDivisions: allowedDivs,
    perms: 1,
  })
})
