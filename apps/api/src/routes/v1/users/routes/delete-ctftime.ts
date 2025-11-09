import { DeleteCtftimeRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(DeleteCtftimeRoute, async ({ res }) => {
  return res.goodCtftimeRemoved()
})
