import { SetEmailRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(SetEmailRoute, async ({ res }) => {
  return res.goodEmailSet()
})
