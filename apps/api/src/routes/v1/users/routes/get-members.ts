import { GetMembersRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(GetMembersRoute, async ({ res }) => {
  return res.goodMemberData([
    {
      id: 'member-1',
      userid: 'user-1',
      email: 'teammate@example.com',
    },
  ])
})
