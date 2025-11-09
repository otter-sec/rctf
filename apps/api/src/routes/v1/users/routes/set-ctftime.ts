import { SetCtftimeRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(SetCtftimeRoute, async ({ res }) => {
  return res.goodCtftimeAuthSet()
})
