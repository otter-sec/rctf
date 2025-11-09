import { GetUserSelfRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(GetUserSelfRoute, async ({ user, res }) => {
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
    teamToken: 'team-token',
    allowedDivisions: ['open', 'student'],
    perms: 1,
  })
})
