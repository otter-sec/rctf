import { response } from '../internal'

export const GoodVerifySent = response('goodVerifySent', {
  status: 200,
  message: 'The account verification email was sent.',
})
