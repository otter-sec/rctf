import { response } from '../dsl'

export const BadToken = response('badToken', {
  status: 401,
  message: 'The token provided is invalid.',
})
