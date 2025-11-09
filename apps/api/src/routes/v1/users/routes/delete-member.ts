import { DeleteMemberRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(DeleteMemberRoute, async ({ res }) => {
  return res.goodMemberDelete()
})
