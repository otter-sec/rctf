import { CtftimeCallbackRoute } from '@rctf/types'
import integrationsGroup from '../group'

integrationsGroup.route(CtftimeCallbackRoute, async ({ res }) => {
  return res.goodCtftimeToken({
    ctftimeToken: 'ctftime-token',
    ctftimeName: 'Example Team',
    ctftimeId: '12345',
  })
})
