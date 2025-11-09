import { SubmitFlagRoute } from '@rctf/types'
import challsGroup from '../group'

challsGroup.route(SubmitFlagRoute, async ({ res }) => {
  return res.goodFlag()
})
