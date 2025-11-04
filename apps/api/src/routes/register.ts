import { declareRouter, RegisterRoute } from '@rctf/types'

import type { ApiContext } from '../types'

export default declareRouter<ApiContext, Response, typeof RegisterRoute>(
  RegisterRoute,
  async (res, body) => {
    if (!body.id) {
      return res.BadResponse()
    }

    return res.GoodResponse({
      id: body.id,
      name: body.name,
      code: 1337,
    })
  }
)
