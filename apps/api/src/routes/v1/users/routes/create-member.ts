import { CreateMemberRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(CreateMemberRoute, async ({ res }) => {
  return res.goodMemberCreate({
    id: 'member-1',
    userid: 'user-1',
    email: 'teammate@example.com',
  })
})
