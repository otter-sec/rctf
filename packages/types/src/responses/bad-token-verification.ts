import { response } from '../dsl'

export const BadTokenVerification = response('badTokenVerification', {
  status: 401,
  message: 'The token provided is invalid.',
})
