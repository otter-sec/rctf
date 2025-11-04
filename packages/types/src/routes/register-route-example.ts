import { defineRoute } from '../dsl'
import { InUser } from '../models/in-user-example'
import { BadResponse, GoodResponse } from '../responses'

export const RegisterRoute = defineRoute({
  path: '/v1/auth/register',
  method: 'POST',
  body: InUser,
  responses: [GoodResponse, BadResponse],
  authRequired: false,
})
