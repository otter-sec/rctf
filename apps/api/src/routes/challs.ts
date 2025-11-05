import { declareRouter, GetChallengeSolvesRoute } from '@rctf/types'

import type { ApiContext } from '../types'

export default declareRouter<
  ApiContext,
  Response,
  typeof GetChallengeSolvesRoute
>(GetChallengeSolvesRoute, async ({ res, query, params }) => {
  console.log('query', query)
  console.log('params', params)
  return res.badChallenge()
})
