import { declareRouter, RegisterRoute } from '@rctf/types'

import type { ApiContext } from '../types'

export default declareRouter<ApiContext, Response, typeof RegisterRoute>(
  RegisterRoute,
  async (res, body, _context) => {
    if (!body.email && !body.ctftimeToken) {
      return res.badEmail()
    }

    if (body.ctftimeToken) {
      return res.goodRegister({ authToken: 'example-token' })
    }

    return res.goodVerifySent()
  }
)
