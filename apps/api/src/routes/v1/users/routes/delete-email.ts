import { DeleteEmailRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(DeleteEmailRoute, async ({ res }) => {
  return res.goodEmailRemoved()
})
