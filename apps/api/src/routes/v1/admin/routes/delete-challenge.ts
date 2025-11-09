import { DeleteChallengeRoute } from '@rctf/types'
import adminGroup from '../group'

adminGroup.route(DeleteChallengeRoute, async ({ res }) => {
  return res.goodChallengeDelete()
})
