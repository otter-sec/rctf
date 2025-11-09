import { UpdateUserRoute } from '@rctf/types'
import usersGroup from '../group'

usersGroup.route(UpdateUserRoute, async ({ user, res }) => {
  return res.goodUserUpdate({
    user: {
      name: user.name,
      email: user.email ?? undefined,
      division: user.division,
    },
  })
})
