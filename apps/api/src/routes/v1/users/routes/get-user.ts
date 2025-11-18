import { GetUserRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(GetUserRoute, async ({ res }) => {
  return res.goodUserData({
    name: 'es3n1n',
    ctftimeId: '12345',
    division: 'open',
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
  })
})
