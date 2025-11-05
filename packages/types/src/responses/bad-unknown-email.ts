import { response } from '../internal'

export const BadUnknownEmail = response('badUnknownEmail', {
  status: 404,
  message: 'The account does not exist.',
})
