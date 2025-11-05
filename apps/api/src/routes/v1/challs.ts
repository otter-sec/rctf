import { GetChallengeSolvesRoute } from '@rctf/types'
import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

group.declareRouter(GetChallengeSolvesRoute, async ({ res, query, params }) => {
  console.log('query', query)
  console.log('params', params)
  return res.badChallenge()
})
