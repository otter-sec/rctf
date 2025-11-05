import {
  LoginRoute,
  RecoverRoute,
  RegisterRoute,
  TestAuthRoute,
  VerifyRoute,
} from '@rctf/types'

import { createRouterGroup } from '../../lib/route-module'

const group = createRouterGroup()
export default group

group.declareRouter(RegisterRoute, async ({ res }) => {
  return res.goodVerifySent()
})

group.declareRouter(LoginRoute, async ({ res }) => {
  return res.goodLogin({ authToken: 'dummy-auth-token' })
})

group.declareRouter(RecoverRoute, async ({ res }) => {
  return res.goodVerifySent()
})

group.declareRouter(VerifyRoute, async ({ res }) => {
  return res.goodVerify({ authToken: 'dummy-verified-token' })
})

group.declareRouter(TestAuthRoute, async ({ res }) => {
  return res.goodToken()
})
